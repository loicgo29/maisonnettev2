import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Contact from './pages/Contact';
import { GiteDetail } from './pages/GiteDetail';
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx("div", { className: "p-8", children: _jsx("h1", { children: "Maisonnette v2" }) }) }), _jsx(Route, { path: "/gite/:slug", element: _jsx(GiteDetail, {}) }), _jsx(Route, { path: "/contact", element: _jsx(Contact, {}) })] }) }));
}
//# sourceMappingURL=App.js.map