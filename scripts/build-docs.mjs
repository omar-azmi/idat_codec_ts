import { Application, TSConfigReader } from "typedoc"

async function main() {
	const site_root = "/" // "/" for localhost, "/byte-codec-ts/" for github pages

	const docs = new Application()
	docs.options.addReader(new TSConfigReader())
	docs.bootstrap({
		entryPoints: [ "./src/index.ts", "./src/utility.ts" ],
		readme: "./readme.md",
		out: "./docs/",
		skipErrorChecking: true,
		githubPages: true,
		includeVersion: true,
		titleLink: "/",
		sidebarLinks: {
			"readme": site_root,
			"index": site_root + "modules/index.html",
			"utility": site_root + "modules/utility.html",
		},
		sort: [ "source-order", "required-first", "kind", ],
	})

	const project = docs.convert()
	if (project) {
		// Project may not have converted correctly
		const outputDir = "./docs/"
		// Rendered docs
		await docs.generateDocs(project, outputDir)
	}
}

main().catch(console.error)
