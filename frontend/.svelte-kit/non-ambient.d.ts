
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
		RouteId(): "/" | "/admin" | "/admin/callback" | "/admin/messages" | "/admin/reservations" | "/admin/reservations/nouvelle" | "/admin/reservations/[id]" | "/api" | "/api/auth" | "/api/auth/callback" | "/api/auth/token" | "/api/calendar" | "/api/calendar/callback" | "/api/test" | "/calendar" | "/contact" | "/gite" | "/gite/[slug]" | "/test-api";
		RouteParams(): {
			"/admin/reservations/[id]": { id: string };
			"/gite/[slug]": { slug: string }
		};
		LayoutParams(): {
			"/": { id?: string | undefined; slug?: string | undefined };
			"/admin": { id?: string | undefined };
			"/admin/callback": Record<string, never>;
			"/admin/messages": Record<string, never>;
			"/admin/reservations": { id?: string | undefined };
			"/admin/reservations/nouvelle": Record<string, never>;
			"/admin/reservations/[id]": { id: string };
			"/api": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/auth/callback": Record<string, never>;
			"/api/auth/token": Record<string, never>;
			"/api/calendar": Record<string, never>;
			"/api/calendar/callback": Record<string, never>;
			"/api/test": Record<string, never>;
			"/calendar": Record<string, never>;
			"/contact": Record<string, never>;
			"/gite": { slug?: string | undefined };
			"/gite/[slug]": { slug: string };
			"/test-api": Record<string, never>
		};
		Pathname(): "/" | "/admin" | "/admin/callback" | "/admin/messages" | "/admin/reservations" | "/admin/reservations/nouvelle" | `/admin/reservations/${string}` & {} | "/api/auth/callback" | "/api/auth/token" | "/api/calendar" | "/api/calendar/callback" | "/api/test" | "/calendar" | "/contact" | `/gite/${string}` & {} | "/test-api";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/images/GOPR5870.JPG" | "/images/GOPR5954.JPG" | "/images/GOPR5979.JPG" | "/images/GOPR5983.JPG" | "/images/GOPR5993.JPG" | "/images/GOPR6007.JPG" | "/images/IMG_0613.JPG" | "/images/IMG_0614.JPG" | "/images/IMG_0616.JPG" | "/images/IMG_0618.JPG" | "/images/IMG_0619.JPG" | "/images/IMG_0621.JPG" | "/images/IMG_0622.JPG" | "/images/IMG_0627.JPG" | "/images/IMG_0632.JPG" | "/images/IMG_0633.JPG" | "/images/IMG_0635.JPG" | "/images/IMG_0643.JPG" | "/images/IMG_0645.JPG" | "/images/OkGOPR5966.JPG" | "/images/OkGOPR5996_1715194028752.JPG" | "/images/OkGOPR6005.JPG" | "/robots.txt" | string & {};
	}
}