
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const PRIVATE_GITE_CALENDAR_ID: string;
	export const PRIVATE_GOOGLE_CLIENT_ID: string;
	export const PRIVATE_GOOGLE_CLIENT_SECRET: string;
	export const PRIVATE_GOOGLE_REDIRECT_URI: string;
	export const COLORTERM: string;
	export const CLAUDE_CODE_MESSAGING_SOCKET: string;
	export const LC_TERMINAL: string;
	export const INFOPATH: string;
	export const HOMEBREW_CELLAR: string;
	export const CLAUDE_CODE_SESSION_ID: string;
	export const npm_config_user_agent: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const NODE_ENV: string;
	export const CLAUDE_CODE_EXECPATH: string;
	export const npm_config_loglevel: string;
	export const npm_config_prefix: string;
	export const SHLVL: string;
	export const npm_package_version: string;
	export const GHCR_TOKEN: string;
	export const TMUX_PANE: string;
	export const EDITOR: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_config_init_module: string;
	export const npm_config_npm_version: string;
	export const npm_execpath: string;
	export const npm_config_userconfig: string;
	export const SVELTEKIT_FORK: string;
	export const npm_node_execpath: string;
	export const _: string;
	export const STARSHIP_SESSION_KEY: string;
	export const CLAUDE_CODE_SESSION_ATTENDED: string;
	export const npm_package_json: string;
	export const PATH: string;
	export const npm_command: string;
	export const GIT_PREFIX: string;
	export const npm_config_globalconfig: string;
	export const GIT_EDITOR: string;
	export const USER: string;
	export const NVM_DIR: string;
	export const npm_lifecycle_event: string;
	export const FPATH: string;
	export const AI_AGENT: string;
	export const LOGNAME: string;
	export const npm_config_local_prefix: string;
	export const CLAUDE_CODE_BRIDGE_SESSION_ID: string;
	export const SSH_TTY: string;
	export const GIT_EXEC_PATH: string;
	export const npm_package_name: string;
	export const npm_config_noproxy: string;
	export const LANG: string;
	export const CLAUDE_CODE_MESSAGING_TOKEN: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const CLAUDE_CODE_CHILD_SESSION: string;
	export const SSH_CLIENT: string;
	export const SHELL: string;
	export const COLOR: string;
	export const TERM: string;
	export const TMPDIR: string;
	export const npm_config_engine_strict: string;
	export const CLAUDECODE: string;
	export const npm_config_cache: string;
	export const LC_TERMINAL_VERSION: string;
	export const TERM_PROGRAM_VERSION: string;
	export const TMUX: string;
	export const CLAUDE_PID: string;
	export const npm_config_node_gyp: string;
	export const PWD: string;
	export const NVM_CD_FLAGS: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const NVM_BIN: string;
	export const HOMEBREW_PREFIX: string;
	export const HOMEBREW_REPOSITORY: string;
	export const HOME: string;
	export const NVM_INC: string;
	export const TERM_PROGRAM: string;
	export const SSH_CONNECTION: string;
	export const npm_lifecycle_script: string;
	export const LS_COLORS: string;
	export const STARSHIP_SHELL: string;
	export const npm_config_global_prefix: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	export const PUBLIC_AUTH_BYPASS: string;
	export const PUBLIC_AUTH_CLIENT_ID: string;
	export const PUBLIC_AUTH_REALM: string;
	export const PUBLIC_AUTH_URL: string;
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		PRIVATE_GITE_CALENDAR_ID: string;
		PRIVATE_GOOGLE_CLIENT_ID: string;
		PRIVATE_GOOGLE_CLIENT_SECRET: string;
		PRIVATE_GOOGLE_REDIRECT_URI: string;
		COLORTERM: string;
		CLAUDE_CODE_MESSAGING_SOCKET: string;
		LC_TERMINAL: string;
		INFOPATH: string;
		HOMEBREW_CELLAR: string;
		CLAUDE_CODE_SESSION_ID: string;
		npm_config_user_agent: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		NODE_ENV: string;
		CLAUDE_CODE_EXECPATH: string;
		npm_config_loglevel: string;
		npm_config_prefix: string;
		SHLVL: string;
		npm_package_version: string;
		GHCR_TOKEN: string;
		TMUX_PANE: string;
		EDITOR: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_config_init_module: string;
		npm_config_npm_version: string;
		npm_execpath: string;
		npm_config_userconfig: string;
		SVELTEKIT_FORK: string;
		npm_node_execpath: string;
		_: string;
		STARSHIP_SESSION_KEY: string;
		CLAUDE_CODE_SESSION_ATTENDED: string;
		npm_package_json: string;
		PATH: string;
		npm_command: string;
		GIT_PREFIX: string;
		npm_config_globalconfig: string;
		GIT_EDITOR: string;
		USER: string;
		NVM_DIR: string;
		npm_lifecycle_event: string;
		FPATH: string;
		AI_AGENT: string;
		LOGNAME: string;
		npm_config_local_prefix: string;
		CLAUDE_CODE_BRIDGE_SESSION_ID: string;
		SSH_TTY: string;
		GIT_EXEC_PATH: string;
		npm_package_name: string;
		npm_config_noproxy: string;
		LANG: string;
		CLAUDE_CODE_MESSAGING_TOKEN: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		CLAUDE_CODE_CHILD_SESSION: string;
		SSH_CLIENT: string;
		SHELL: string;
		COLOR: string;
		TERM: string;
		TMPDIR: string;
		npm_config_engine_strict: string;
		CLAUDECODE: string;
		npm_config_cache: string;
		LC_TERMINAL_VERSION: string;
		TERM_PROGRAM_VERSION: string;
		TMUX: string;
		CLAUDE_PID: string;
		npm_config_node_gyp: string;
		PWD: string;
		NVM_CD_FLAGS: string;
		NODE: string;
		INIT_CWD: string;
		NVM_BIN: string;
		HOMEBREW_PREFIX: string;
		HOMEBREW_REPOSITORY: string;
		HOME: string;
		NVM_INC: string;
		TERM_PROGRAM: string;
		SSH_CONNECTION: string;
		npm_lifecycle_script: string;
		LS_COLORS: string;
		STARSHIP_SHELL: string;
		npm_config_global_prefix: string;
		NoDefaultCurrentDirectoryInExePath: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		PUBLIC_AUTH_BYPASS: string;
		PUBLIC_AUTH_CLIENT_ID: string;
		PUBLIC_AUTH_REALM: string;
		PUBLIC_AUTH_URL: string;
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
