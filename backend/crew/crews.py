"""
BioDockify CrewAI Crews - Pre-built workflows for drug discovery
Agents: Docking, Chemistry, ADMET, Analysis, MD, Orchestrator
"""

from crewai import Crew, Process, Task
from crew.agents import (
    create_docking_agent,
    create_chemistry_agent,
    create_admet_agent,
    create_analysis_agent,
    create_md_agent,
    create_orchestrator_agent,
)


def create_virtual_screening_crew(llm=None) -> Crew:
    """
    Virtual Screening Crew - Screen compound libraries against a target protein.
    Pipeline: Dock compounds → Analyze → ADMET filter → Report
    """
    docking_agent = create_docking_agent(llm)
    analysis_agent = create_analysis_agent(llm)
    admet_agent = create_admet_agent(llm)
    orchestrator = create_orchestrator_agent(llm)

    dock_task = Task(
        description="Run molecular docking for all compounds against the target receptor. Use Vina for initial screening and GNINA + RF-Score for best hits.",
        expected_output="Docking results with binding energies for all screened compounds",
        agent=docking_agent,
    )

    analyze_task = Task(
        description="Analyze docking results, rank compounds using consensus scoring. Identify top 10% by binding energy.",
        expected_output="Ranked list of compounds with consensus scores",
        agent=analysis_agent,
    )

    admet_task = Task(
        description="Run ADMET prediction on top-ranked compounds. Filter by Lipinski Rule of 5 and flag hERG/hepatotox risks.",
        expected_output="ADMET assessment with drug-likeness pass/fail for each compound",
        agent=admet_agent,
    )

    report_task = Task(
        description="Synthesize docking scores and ADMET results into a final hit list. Recommend top 3-5 candidates with rationale.",
        expected_output="Final hit list with scores, ADMET summary, and next-step recommendations",
        agent=orchestrator,
    )

    return Crew(
        agents=[docking_agent, analysis_agent, admet_agent, orchestrator],
        tasks=[dock_task, analyze_task, admet_task, report_task],
        process=Process.sequential,
        verbose=True,
        memory=True,
        max_rpm=30,
        share_crew=True,
    )


def create_lead_optimization_crew(llm=None) -> Crew:
    """
    Lead Optimization Crew - Iteratively improve a lead compound.
    
    Pipeline: Dock → Analyze interactions → Suggest modifications → Mutate → Redock → Rank
    """
    docking_agent = create_docking_agent(llm)
    chemistry_agent = create_chemistry_agent(llm)
    analysis_agent = create_analysis_agent(llm)
    orchestrator = create_orchestrator_agent(llm)

    initial_dock_task = Task(
        description="Perform initial docking of the lead compound against the target receptor. Analyze binding pose and energy.",
        expected_output="Initial docking results with binding energy and pose details",
        agent=docking_agent,
    )

    analyze_task = Task(
        description="Analyze protein-ligand interactions for the lead compound. Identify key interactions (H-bonds, hydrophobic, pi-stacking) and areas for improvement.",
        expected_output="Interaction analysis report with optimization suggestions",
        agent=analysis_agent,
    )

    optimize_task = Task(
        description="Based on the interaction analysis, suggest structural modifications to improve binding affinity. Generate 3-5 optimized variants using bioisosteric replacements and functional group modifications.",
        expected_output="List of optimized SMILES with rationale for each modification",
        agent=chemistry_agent,
    )

    redock_task = Task(
        description="Dock all optimized variants and compare binding energies with the original compound.",
        expected_output="Docking results for all variants with comparative analysis",
        agent=docking_agent,
    )

    final_analysis_task = Task(
        description="Rank all variants (original + optimized) using consensus scoring. Identify the best candidate(s) and provide final recommendations.",
        expected_output="Final ranked list of candidates with detailed analysis and recommendations",
        agent=orchestrator,
    )

    return Crew(
        agents=[docking_agent, analysis_agent, chemistry_agent, orchestrator],
        tasks=[initial_dock_task, analyze_task, optimize_task, redock_task, final_analysis_task],
        process=Process.sequential,
        verbose=True,
        memory=True,
        max_rpm=30,
        share_crew=True,
    )


def create_admet_prediction_crew(llm=None) -> Crew:
    """
    ADMET Prediction Crew - Full ADMET profiling for compound libraries.
    
    Pipeline: Calculate properties → Predict ADMET → Filter by rules → Rank → Generate report
    """
    chemistry_agent = create_chemistry_agent(llm)
    admet_agent = create_admet_agent(llm)
    analysis_agent = create_analysis_agent(llm)

    properties_task = Task(
        description="Calculate molecular properties (MW, LogP, TPSA, HBD, HBA, rotatable bonds) for all compounds in the library.",
        expected_output="Calculated properties for all compounds",
        agent=chemistry_agent,
    )

    admet_task = Task(
        description="Run full ADMET predictions for all compounds including absorption (intestinal, Caco-2, BBB), metabolism (CYP inhibition), and toxicity (AMES, hERG, hepatotoxicity).",
        expected_output="ADMET prediction results for all compounds",
        agent=admet_agent,
    )

    filter_task = Task(
        description="Filter compounds by Lipinski Rule of 5, Veber rules, and ADMET criteria. Identify compounds that pass all filters.",
        expected_output="Filtered list of drug-like compounds with pass/fail reasons",
        agent=admet_agent,
    )

    report_task = Task(
        description="Generate a comprehensive ADMET report with rankings, visualizations of property distributions, and recommendations for the best candidates.",
        expected_output="Comprehensive ADMET report with rankings and recommendations",
        agent=analysis_agent,
    )

    return Crew(
        agents=[chemistry_agent, admet_agent, analysis_agent],
        tasks=[properties_task, admet_task, filter_task, report_task],
        process=Process.sequential,
        verbose=True,
        memory=True,
        max_rpm=30,
        share_crew=True,
    )


def create_docking_analysis_crew(llm=None) -> Crew:
    """
    Docking Analysis Crew - Dock, analyze, and report.
    
    Pipeline: Dock → Score → Consensus → Interactions → Report
    """
    docking_agent = create_docking_agent(llm)
    analysis_agent = create_analysis_agent(llm)

    dock_task = Task(
        description="Run molecular docking with multiple scoring functions (Vina, GNINA, RF-Score). Generate multiple binding poses.",
        expected_output="Docking results with poses and scores from multiple scoring functions",
        agent=docking_agent,
    )

    consensus_task = Task(
        description="Compute consensus scores combining Vina, GNINA, RF-Score. Rank poses by consensus score.",
        expected_output="Ranked poses with consensus scores",
        agent=analysis_agent,
    )

    interaction_task = Task(
        description="Analyze protein-ligand interactions for the top-ranked poses. Identify key binding interactions.",
        expected_output="Interaction analysis with H-bonds, hydrophobic contacts, pi-stacking",
        agent=analysis_agent,
    )

    report_task = Task(
        description="Generate a comprehensive docking report with scores, poses, interactions, and recommendations.",
        expected_output="Final report with all results and actionable insights",
        agent=analysis_agent,
    )

    return Crew(
        agents=[docking_agent, analysis_agent],
        tasks=[dock_task, consensus_task, interaction_task, report_task],
        process=Process.sequential,
        verbose=True,
        memory=True,
        max_rpm=30,
        share_crew=True,
    )


def create_drug_discovery_crew(llm=None) -> Crew:
    """
    Master Drug Discovery Crew - Full pipeline from target to lead.
    Pipeline: Dock → Analyze → ADMET → MD validation → Lead selection
    """
    orchestrator = create_orchestrator_agent(llm)
    docking_agent = create_docking_agent(llm)
    chemistry_agent = create_chemistry_agent(llm)
    admet_agent = create_admet_agent(llm)
    analysis_agent = create_analysis_agent(llm)
    md_agent = create_md_agent(llm)

    dock_task = Task(
        description="Dock the compound library against the target receptor. Use Vina for screening, GNINA + RF-Score for top hits.",
        expected_output="Ranked docking results with binding energies and poses",
        agent=docking_agent,
    )

    analyze_task = Task(
        description="Analyze protein-ligand interactions for top docking hits. Rank using consensus scoring.",
        expected_output="Interaction analysis and ranked hit list",
        agent=analysis_agent,
        context=[dock_task],
    )

    admet_task = Task(
        description="Predict ADMET properties for top-ranked hits. Filter by Lipinski, Veber, Egan rules.",
        expected_output="ADMET assessment with drug-likeness pass/fail for each compound",
        agent=admet_agent,
        context=[analyze_task],
    )

    md_task = Task(
        description="Run MD simulation on the top candidate to validate binding pose stability. Interpret RMSD and recommend next steps.",
        expected_output="MD stability report with RMSD analysis and pose validation",
        agent=md_agent,
        context=[admet_task],
    )

    final_task = Task(
        description="Synthesize all results — docking, ADMET, MD — into a comprehensive lead selection report. Recommend top 3 candidates with rationale.",
        expected_output="Final lead selection report with top candidates and next-step recommendations",
        agent=orchestrator,
        context=[md_task],
    )

    return Crew(
        agents=[docking_agent, analysis_agent, admet_agent, md_agent, chemistry_agent, orchestrator],
        tasks=[dock_task, analyze_task, admet_task, md_task, final_task],
        process=Process.sequential,
        verbose=True,
        memory=True,
        max_rpm=30,
        share_crew=True,
        planning=True,
    )


def create_md_simulation_crew(llm=None) -> Crew:
    """
    MD Simulation Crew - Validate docking pose stability via molecular dynamics.
    Pipeline: Suggest params → Run MD → Interpret RMSD → Report
    """
    md_agent = create_md_agent(llm)
    analysis_agent = create_analysis_agent(llm)
    orchestrator = create_orchestrator_agent(llm)

    params_task = Task(
        description="Suggest optimal MD simulation parameters for the target protein family. Consider simulation length, temperature, and solvent model.",
        expected_output="Recommended MD parameters with scientific rationale",
        agent=md_agent,
    )

    run_task = Task(
        description="Run the MD simulation using the recommended parameters. Monitor for early instability and report trajectory status.",
        expected_output="MD trajectory data with RMSD time series and energy statistics",
        agent=md_agent,
        context=[params_task],
    )

    interpret_task = Task(
        description="Interpret the MD trajectory: assess RMSD stability, identify key binding interactions over time, flag any pose collapse.",
        expected_output="Stability assessment with RMSD interpretation and key dynamic interactions",
        agent=md_agent,
        context=[run_task],
    )

    report_task = Task(
        description="Generate a final MD report: stability verdict, key interactions, limitations, and concrete next-step recommendations.",
        expected_output="Comprehensive MD report with stability verdict and recommendations",
        agent=orchestrator,
        context=[interpret_task],
    )

    return Crew(
        agents=[md_agent, analysis_agent, orchestrator],
        tasks=[params_task, run_task, interpret_task, report_task],
        process=Process.sequential,
        verbose=True,
        memory=True,
        max_rpm=30,
        share_crew=True,
    )
