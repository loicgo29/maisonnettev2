# Frontend Setup - Bonnes Pratiques

## Stack
- **Vite 7.0.0** + React 18 + TypeScript
- **Tailwind CSS** pour les styles
- **React Router** v7 pour le routing
- **React Query** (@tanstack/react-query) pour les données
- **Playwright** pour les E2E tests

## Configuration Correcte

### 1. Port Frontend
- **Default**: 5173 (défini dans `vite.config.ts`)
- **Override**: `npm run dev -- --port XXXX`
- **Pas de conflits**: Vérifier `lsof -i :PORT` avant de lancer

### 2. Routes React Router
**Toujours ajouter les routes dans `src/App.tsx`:**
```tsx
import { GiteDetail } from './pages/GiteDetail'

<Route path="/gite/:slug" element={<GiteDetail />} />
```
**Ne pas oublier l'import du composant !**

### 3. Tailwind CSS
**Requis dans `src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. API Proxy
**Déjà configuré dans `vite.config.ts`:**
- `/api/*` → `http://localhost:3001`
- Utiliser: `api.get('/api/gites')` depuis le frontend
- Le proxy s'initialise au démarrage de Vite

## Workflow Correct

### Démarrer le Dev Env Complet
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
npm run dev -- --port 1234

# Terminal 3 - Database (si nécessaire)
docker-compose up -d postgres-maisonnettev2
```

### Debug Checklist
1. ✅ Backend respond: `curl http://localhost:3001/api/gites`
2. ✅ Frontend loads: `curl http://localhost:PORT | grep 'root'`
3. ✅ CSS loads: Check browser DevTools → Styles
4. ✅ Routes registered: Check React DevTools → Router
5. ✅ API calls work: Check Network tab in DevTools

## Plugins Recommandés

### ESLint
- Déjà config: `.eslintrc.json`
- Run: `npm run lint`

### TypeScript
- `tsconfig.json` configuré
- Run type check: `npm run type-check`

### Testing
- **Unit tests**: Vitest (config: `vitest.config.ts`)
- **E2E tests**: Playwright (config: `playwright.config.ts`)

## Erreurs Courantes

### "Page is black/empty"
- [ ] Vérifier que les routes sont dans App.tsx
- [ ] Vérifier que @tailwind directives sont dans index.css
- [ ] Vérifier que le port ne conflit pas avec autre service
- [ ] Vérifier les logs: `npm run dev` (pas en background)

### "API returns 404"
- [ ] Backend sur port 3001? `lsof -i :3001`
- [ ] Vérifier l'URL: `/api/gites` pas `/gites`
- [ ] Vérifier le proxy dans vite.config.ts

### "Styles not applied"
- [ ] Vérifier `@tailwind` dans index.css
- [ ] Hard refresh: `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Linux)
- [ ] Vérifier tailwind.config.js content paths

## Meilleure Approche pour Ajouter une Page

1. **Créer le composant**: `src/pages/NewPage.tsx`
2. **Ajouter la route**: App.tsx + import
3. **Tester localement**: Naviguer à `/new-page`
4. **Vérifier les types**: `npm run type-check`
5. **Vérifier les logs**: Browser console + Network tab

