/**
 * Helper function for building a SHOW_TEXT effect object
 *
 * @param {!Array<string>} queue The list of users in queue
 * @return {object}
 */
function buildTextOverlayEffect(queue) {
	return {
		text: queue.map((user, i) => `${i + 1}: ${user}`).join("\n"),
		inbetweenAnimation: null,
		inbetweenDelay: null,
		inbetweenDuration: null,
		inbetweenRepeat: null,
		enterAnimation: null,
		enterDuration: null,
		exitAnimation: null,
		exitDuration: null,
		customCoords: null,
		position: null,
		duration: null,
		height: null,
		width: null,
		justify: null,
		align: null,
		dontWrap: null,
		debugBorder: null,
		overlayInstance: null
	};
}

exports.buildTextOverlayEffect = buildTextOverlayEffect;
