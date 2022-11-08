import { style } from "@vanilla-extract/css"

export const container = style({
	padding: 10
})

export const myStyle = style({
	// cast to pixels
	padding: 10,
	marginTop: 25,
	backgroundColor: "#004499",
	// unitless properties
	flexGrow: 1,
	opacity: 0.5
})
