/**
 * Renders the result of the test run
 */
window.addEventListener("load", function() {
	
	var rendered = TestLogger.getInstance().render();
	document.getElementById("result").appendChild(rendered);
	
	TestLogger.getInstance().dumpLog();
});
