/** when true, additional assignments are done by the codecs to the schema objects themselves, in order to inspect the values in case of a breakdown. <br>
 * @type {boolean}
 * @category Compiler Options
*/
export const DEBUG = true

/** when `true`, `esbuild` minification is enabled <br>
 * @type {boolean}
 * @category Compiler Options
*/
export const MINIFY = true

/** when `true`, `esbuild` will bundle the code into one javascript file <br>
 * @type {boolean}
 * @category Compiler Options
*/
export const BUNDLE = true

/** define the set of macro-flags that will result in the exclusion of some code in the compiled bundle <br>
 * in general, the items presented here cannot be automatically ommited by `esbuild`, because they are being referenced by some other none-dead code. <br>
 * only *you*, as the developer, can know whether a certain portion or referenced code is actually dead and unused by your application. <br>
 * for these flags to work, **do not import** them into your js/ts source code. instead only **declare** them in your typescript files as `boolean`.
 * while for js files, you can't do anything about declaring their existence.
 * @example
 * ```ts
 * declare [DONOT_deadFunc2, DONOT_otherFunc,] = [boolean, boolean]
 * export const func1 = () => {
 * 	//lots of code
 * 	if(never_occuring_condition === true) return deadFunc2()
 * }
 * const deadFunc2 = DONOT_deadFunc2 || (
 * 	() => { console.log("you were not supposed to be here. you have made a terrible mistake") }
 * )
 * ```
 * @category Compiler Options
*/
export const DONOT_INCLUDE = {
	DONOT_deadFunc2: false,
	DONOT_otherFunc: false,
}

//module.exports.compiler_options = { DEBUG, MINIFY, BUNDLE }
export default { DEBUG, MINIFY, BUNDLE, ...DONOT_INCLUDE }