import compiler_options from "../src/compiler_options.mjs"
import esbuild from "esbuild"
import { solidPlugin } from "esbuild-plugin-solid"
import { vanillaExtractPlugin } from "@vanilla-extract/esbuild-plugin"

esbuild.build({
	entryPoints: [ "./src/index.html", "./src/index.tsx" ],
	outdir: "./dist/",
	loader: {
		".html": "copy",
	},
	bundle: compiler_options.BUNDLE,
	minify: compiler_options.MINIFY,
	//mangleProps: /_$/,
	platform: "neutral",
	format: "esm",
	target: "esnext",
	plugins: [ solidPlugin(), vanillaExtractPlugin() ],
	define: compiler_options,
}).catch(() => process.exit(1))