var config = {};

config.postgres = (process.env.NODE_ENV === "debug")
	//? "pg://postgres:jet-link1234@localhost:5432/" : "pg://postgres:jet-link123@172.16.40.13:5432/";
	//? "pg://postgres:jet-link1234@192.168.20.18:5432/":"pg://postgres:jet-link1234@192.168.20.18:5432/";
	? "pg://postgres:postgres@104.154.51.217:5432/":"pg://postgres:postgres@104.154.51.217:5432/";

config.db = {};
config.db.CDC_contact_person = "CDC_contact_person";
module.exports = config;