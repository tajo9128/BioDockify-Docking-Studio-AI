# Docking Studio v2.0.1

**Tag:** v2.0.1  
**Commit:** 40d1336

## Release Notes

### Fixed

- **405 errors on all docking API calls** — nginx `proxy_pass` trailing slashes stripped the `/dock/` prefix from URIs, causing Method Not Allowed on every docking API call
- **Service port mismatches** — internal service URLs defaulted to port 8000 instead of docker-compose-mapped ports (8001-8004)
- **15 missing nginx proxy routes** — `/dock/`, `/pharmacophore/`, `/jobs`, `/upload`, `/download`, `/security/`, `/analyze/`, `/binding-site`, `/rmsd/`, `/gpu/` had no backend
- **Redis key mismatch** — api-backend used `job:*` keys while docking-service used `docking_job:*`, making job status always return not_found
- **rdkit-service missing endpoints** — `/smiles-to-3d`, `/optimize`, `/convert`, `/process` were called by other services but not implemented
- **pharmacophore-service parameter mismatch** — accepted `smiles`/`pdb` but callers sent `receptor_pdb`/`ligand_pdb`
- **Docking SSE → polling** — EventSource doesn't work with JSON responses; replaced with 3-second polling
- **Job ID mismatch** — frontend generated `docking-${Date.now()}` but backend returned its own UUID, breaking progress tracking
- **Settings page non-functional** — Save/Reset buttons in General and Docker tabs had no onClick handlers
- **CVE-2026-24486** — `python-multipart` upgraded from 0.0.20 to >=0.0.22 (arbitrary file write vulnerability)

### Infrastructure

- **Microservices architecture** — 9 Docker services: gateway, api-backend, brain-service, docking-service, rdkit-service, pharmacophore-service, redis-worker, postgres, redis
- **React SPA frontend** — migrated from PyQt6 desktop to Vite+React+TypeScript SPA served by nginx
- **External LLM support** — configurable AI providers (OpenAI, DeepSeek, Zhipu AI, Qwen, Moonshot/Kimi, SiliconFlow, Groq, Ollama, LM Studio)
- **Gateway volume fix** — removed stale `ui-build` named volume that overrode fresh frontend builds

---

## How to Create GitHub Release

1. Install GitHub CLI: https://cli.github.com/
2. Authenticate: `gh auth login`
3. Create release:
```bash
gh release create v2.0.1 \
  --repo tajo9128/Docking-studio \
  --title "Docking Studio v2.0.1" \
  --notes "See CHANGELOG.md for full list of fixes"
```

Or create manually at: https://github.com/tajo9128/Docking-studio/releases/new
