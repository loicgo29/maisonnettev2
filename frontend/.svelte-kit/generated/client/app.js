// in dev, this makes Vite inject its client as this module's first dependency,
// so that global constant replacements are installed before any other module
// (including user hooks) evaluates. In build it's inert.
import.meta.hot;




export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22')
];

export const server_loads = [2,4];

export const dictionary = {
		"/": [6],
		"/admin": [7,[2]],
		"/admin/callback": [8,[2,3]],
		"/admin/comptabilite": [9,[2]],
		"/admin/comptabilite/test": [10,[2]],
		"/admin/messages": [11,[2]],
		"/admin/reservations": [12,[2]],
		"/admin/reservations/nouvelle": [14,[2]],
		"/admin/reservations/[id]": [13,[2]],
		"/backoffice": [15,[4]],
		"/backoffice/login": [16,[4,5]],
		"/backoffice/logout": [17,[4]],
		"/calendar": [18],
		"/comptabilite": [19],
		"/contact": [20],
		"/gite/[slug]": [21],
		"/login": [22]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';

export const get_error_template = () => import('../shared/error-template.js').then(m => m.default);