
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/calendar" | "/api/calendar/callback" | "/api/test" | "/calendar" | "/gite" | "/gite/[slug]" | "/test-api";
		RouteParams(): {
			"/gite/[slug]": { slug: string }
		};
		LayoutParams(): {
			"/": { slug?: string | undefined };
			"/api": Record<string, never>;
			"/api/calendar": Record<string, never>;
			"/api/calendar/callback": Record<string, never>;
			"/api/test": Record<string, never>;
			"/calendar": Record<string, never>;
			"/gite": { slug?: string | undefined };
			"/gite/[slug]": { slug: string };
			"/test-api": Record<string, never>
		};
		Pathname(): "/" | "/api/calendar" | "/api/calendar/callback" | "/api/test" | "/calendar" | `/gite/${string}` & {} | "/test-api";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}