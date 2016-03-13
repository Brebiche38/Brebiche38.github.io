var db = new Firebase("https://amber-inferno-5019.firebaseIO.com/");
var users = db.child("users");
var events = db.child("events");

function get(ref, callback) {
	ref.once("value", function (dataSnapshot) {
		callback(dataSnapshot.val());
	})
}

/* LOGIN (need callbacks, except logout) */
var userID = null;

// returns user ID
function createUser(email, password, success, failure) {
	db.createUser({
		email: email,
		password: password
	}, function (error, userData) {
		if (error) {
			failure();
		} else {
			var uid = userData.uid;
			// Create user structures
			users.child("userinfo").child(uid).set({
				contactinfo: {
					email: email,
				}
			});
			users.child("disponibilities").child(uid).set({
				weekly: {
					monday:0,
					tuesday:0,
					wednesday:0,
					thursday:0,
					friday:0,
					saturday:0,
					sunday:0
				}, periods: {}
			});

			// Login and return
			login(email, password, function (uid) {
				success(uid);
			}, function () {
				failure();
			});
		}
	});
}

// Returns user ID
function login(email, password, success, failure) {
	db.authWithPassword({
		email: email,
		password: password
	}, function (error, userData) {
		if (error) {
			failure();
		} else {
			userID = userData.uid;
			success(userData.uid);
		}
	})
}

function logout() {
	db.unauth();
}

/* USER INFO */

function updateName(name) {
	if (!userID) return false;

	users.child("userinfo").child(userID).update({
		"name": name
	});

	return true;
}

function updateEmail(oldEmail, newEmail, password, success, failure) {
	if (!userID) failure();

	db.changeEmail({
		oldemail: oldEmail,
		newemail: newEmail,
		password: password
	}, function(error) {
		if (error) {
			failure();
		} else {
			users.child("userinfo").child(userID).update({
				"contactinfo/email": newEmail
			})
			success();
		}
	})
}

function updatePhoneNumber(phoneNumber) {
	var userInfo = db.child("users").child("userinfo").child(userID);

	userInfo.update({
		"contactinfo/phonenumber": phoneNumber
	});

	return true;
}

function getName(callback) {
	get(users.child("userinfo").child(userID).child("name"), callback);
}

function getUserName(user, callback) {
	get(users.child("userinfo").child(user).child("name"), callback);	
}

function getEmail(callback) {
	get(users.child("userinfo").child(userID).child("contactinfo").child("email"), callback);
}

function getPhoneNumber(callback) {
	get(users.child("userinfo").child(userID).child("contactinfo").child("phonenumber"), callback);
}

/* INTERESTS */

function isInterestedIn(topic, callback) {
	get(users.child("interests").child(userID).child(topic), callback);
}

function allInterests(callback) {
	get(users.child("interests").child(userID), callback);
}

function setInterest(topic) {
	users.child("interests").child(userID).child("topic").set(true);
}

/* DISPONIBILITIES */

function isAvailable(start, end, callback) {
	get(users.child("disponibilities").child(userID), function (disponibilities) {
		// Check expanded disponibilities
		for (var key in disponibilities.periods) {
			if (!disponibilities.periods.hasOwnProperty(key)) continue;

			var period = disponibilities.periods[key];
			if (period.start < start && end < period.end) {
				callback(true);
			}
		}

		// TODO Check for weekly disponibilities

		callback(true); // TODO change to false
	});
}

function addDisponibilityPeriod(start, end) {
	users.child("disponibilities").child(userID).child("periods").push({
		start: start,
		end: end
	});
}

function removeDisponibilityPeriod(id) {
	users.child("disponibilities").child(userID).child("periods").child(id).set(null);
}

/* SUBSCRIPTION */

function subscribe(eventID) {
	if (!userID) return false;

	users.child("events").child(userID).child(eventID).set(true);
	events.child("subscribers").child(eventID).child(userID).set(true);
	events.child("eventinfo").child(eventID).child("participantcount").transaction(function (current_value) {
		//console.log("werein");
		return (current_value || 0) + 1;
	});

	return true;

	// Notifications...
}

function getSubscribedEvents(callback) {
	get(users.child("events").child(userID), function (events) {
		var subscribedEvents = [];
		for (var key in events) {
			if (!events.hasOwnProperty(key)) continue;

			if (events[key]) {
				subscribedEvents.push(key);
			}
		}
		callback(subscribedEvents);
	});
}

function getSubscribers(eventID, callback) {
	get(events.child("subscribers").child(eventID), function (users) {
		var subscribers = [];
		for (var key in users) {
			if (!users.hasOwnProperty(key)) continue;

			if (users[key]) {
				subscribers.push(key);
			}
		}
		callback(subscribers);
	});
}

function isSubscribedTo(eventID, callback) {
	if (userID) {
		get(users.child("events").child(userID).child(eventID), function (subscribed) {
			callback(subscribed);
		});
	}
	callback(false);
}

/* EVENT MANAGEMENT */

function createEvent(name, location, start, end, category, description) {
	console.log(location);
	var eventID = events.child("eventinfo").push({
		name: name,
		category: category,
		host: userID
	}).toString();
	eventID = eventID.substr(eventID.lastIndexOf('/') + 1);
	console.log(eventID);
	users.child("hostedevents").child(userID).child(eventID).set(true);
	events.child("locations").child(eventID).set(location);
	console.log("hey");
	events.child("time").child(eventID).set({
		start: start.toString(),
		end: end.toString()
	});
	console.log("wuhu");
	events.child("descriptions").child(eventID).set(description);
}

function deleteEvent() {
	// TODO complicated
}

function updateEventName(eventID, name) {
	events.child("eventinfo").child(userID).update({
		"name": name
	});
}

function updateEventCategory(eventID, category) {
	events.child("eventinfo").child(userID).update({
		"category": category
	});
}

function updateEventLocation(eventID, location) {
	events.child("locations").child(userID).set(location);
}

function updateEventStart(eventID, start) {
	events.child("time").child(userID).update({
		"start": start
	});
}

function updateEventEnd(eventID, end) {
	events.child("time").child(userID).update({
		"end": end
	});
}

function updateEventDescription(eventID, description) {
	events.child("descriptions").child(userID).set(description);
}

function getEventName(eventID, callback) {
	get(events.child("eventinfo").child(eventID).child("name"), callback);
}

function getEventCategory(eventID, callback) {
	get(events.child("eventinfo").child(eventID).child("category"), callback);
}

function getEventHost(eventID, callback) {
	get(events.child("eventinfo").child(eventID).child("host"), callback);
}

function getEventLocation(eventID, callback) {
	get(events.child("locations").child(eventID), callback);
}

function getEventStart(eventID, callback) {
	get(events.child("time").child(eventID).child("start"), callback);
}

function getEventEnd(eventID, callback) {
	get(events.child("time").child(eventID).child("end"), callback);
}

function getEventDescription(eventID, callback) {
	get(events.child("descriptions").child(eventID), callback);
}

/* SEARCH */

function getEvents(start, end, location, range, category, callback) { // Warning, callback is called for each result
	events.child("eventinfo").once("value", function (eventsDATA) {		
        eventsDATA.forEach(function(eventSnapshot) {
			var eventID = eventSnapshot.key();
			console.log(eventID);
			//if (eventSnapshot.val().category == category) {
                events.child("time").child(eventSnapshot.key()).on("value", function (timeSnapshot) {
                    var times = timeSnapshot.val();
                    console.log(times.start);
		            //if (start < new Date(times.start) && new Date(times.end) < end) {
						get(events.child("locations").child(eventID), function (eventLocation) {
							console.log(eventLocation.locationString);
							//if (distance(location, eventLocation) < range) {
								get(events.child("descriptions").child(eventID), function (description) {
                                    callback(eventID, eventSnapshot.val(), times, eventLocation, description);
								});
							//}
						});
					//}
	            });
			//}
		});
	});
}

function distance (loc1, loc2) {
	var lat1 = loc1.coords.lat;
	var lng1 = loc1.coords.lng;
	var lat2 = loc2.coords.lat;
	var lng2 = loc2.coords.lng;

	var R = 6371; // metres
	var phi1 = lat1.toRadians();
	var phi2 = lat2.toRadians();
	var deltaphi = (lat2-lat1).toRadians();
	var deltalambda = (lon2-lon1).toRadians();

	var a = Math.sin(deltaphi/2) * Math.sin(deltaphi/2) +
	        Math.cos(phi1) * Math.cos(phi2) *
	        Math.sin(deltalambda/2) * Math.sin(deltalambda/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	var d = R * c;

	return d;
}