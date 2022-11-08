import { render } from "solid-js/web"
import { createSignal, For, JSX } from "solid-js"

import { myStyle } from "./index.css.ts"

function Counter() {
	const [count, setCount] = createSignal(0)
	const increment = () => setCount(count() + 1)

	return (
		<button type="button" class={myStyle} onClick={increment}>
			{count()}
		</button>
	)
}

function Banner(title?: string, caption?: string) {
	title = title || "welcome"
	caption = caption || "lorem ipsum dolor sit amet"
	const dom_str = <><div class="column">
		<div class="hero hero-sm bg-dark">
			<div class="hero-body"><h1>{title}</h1><p>{caption}</p></div>
		</div>
	</div></>
	return dom_str
}

function Content(dom_str_elements: JSX.Element[]) {
	return (<>
		<For each={dom_str_elements} fallback={<div>No items</div>}>
			{(item, index) => <div data-index={index()}>{item}</div>}
		</For>
	</>)
}

render(() => Content([Banner("hello world"), <Counter />, Counter(), <Counter />]), document.body)
