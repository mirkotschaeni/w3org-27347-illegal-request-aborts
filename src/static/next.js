/**
 * Navigate to the next test case or to the result page
 */
window.addEventListener("load", function() {
	if (Util.read("autoRun")) {
		Util.navigateToNext();
	} else {
		var nextButton = document.createElement("button");
		nextButton.innerHTML = "run next test";
		nextButton.addEventListener("click", Util.navigateToNext.bind(Util));
		document.getElementById("main").appendChild(nextButton);	
	}
});



