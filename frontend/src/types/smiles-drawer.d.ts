declare module 'smiles-drawer' {
  interface DrawerOptions {
    width?: number;
    height?: number;
    bondThickness?: number;
    bondLength?: number;
    shortBondLength?: number;
    bondSpacing?: number;
    atomVisualization?: string;
    isomeric?: boolean;
    debug?: boolean;
    simplifySmiles?: boolean;
    themes?: Record<string, Record<string, string>>;
  }

  class Drawer {
    constructor(options?: DrawerOptions);
    draw(tree: any, canvas: HTMLElement, theme?: string, infoOnly?: boolean): void;
  }

  function parse(smiles: string, successCallback: (tree: any) => void, errorCallback?: (err: any) => void): void;

  interface SmilesDrawerInterface {
    Drawer: typeof Drawer;
    parse: typeof parse;
  }

  const SmilesDrawer: SmilesDrawerInterface;
  export default SmilesDrawer;
}
