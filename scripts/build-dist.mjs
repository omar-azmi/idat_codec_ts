import compiler_options from "../src/compiler_options.mjs"
import esbuild from "esbuild"

esbuild.build({
	entryPoints: [ /*"./src/index.html",*/ "./src/index.ts" ],
	outdir: "./dist/",
	loader: {
		//".html": "copy",
	},
	bundle: compiler_options.BUNDLE,
	minify: compiler_options.MINIFY,
	//mangleProps: /_$/,
	platform: "neutral",
	format: "esm",
	target: "esnext",
	plugins: [],
	define: compiler_options,
}).catch(() => process.exit(1))