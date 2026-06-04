package dataservice

// TKACRBaseURL is the base URL for the external TKACR movies data service.
// All movie catalog and coordinate queries are proxied through this host.
const TKACRBaseURL = "http://tkacr-dev5.alphonso.tv:8080"

// TMDBImagePrefix is prepended to image_link paths returned by the upstream API
// to form fully qualified poster/backdrop URLs.
const TMDBImagePrefix = "https://image.tmdb.org/t/p/w92/"
