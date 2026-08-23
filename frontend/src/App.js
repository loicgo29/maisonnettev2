import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Contact from './pages/Contact';
export default function App() {
    return (_jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/contact", element: _jsx(Contact, {}) }), _jsx(Route, { path: "/", element: _jsx("div", { className: "p-8", children: _jsx("h1", { children: "Maisonnette v2" }) }) })] }) }));
}
//# sourceMappingURL=App.js.map