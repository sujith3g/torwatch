Torrentz = function(urlPart, keyword, url, timeInterval) {

    this.urlPart = (urlPart) ? urlPart : "_";
    this.keyword = (keyword) ? keyword : "_";
    this.url = (url) ? url : "http://torrentz.in";

    this.timeInterval = (timeInterval) ? parseInt(timeInterval) : 1000 * 60;
    this.timeIntervalHandle = {};

}

// search

Torrentz.prototype.getData = function(urlPart, keyword, url) {
    var _this = this;

    this.urlPart = (urlPart) ? urlPart : "_";
    this.keyword = (keyword) ? keyword : "_";
    this.url = (url) ? url : "http://torrentz.in";

    var torrentzHttpResponse = HTTP.get(this.url + "/" + this.urlPart, {
        headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_2 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8H7 Safari/6533.18.5"
        },
        params: {
            f: this.keyword
        },
        timeout: 1000 * 60
    });

    if (torrentzHttpResponse.statusCode === 200) {
        var torrents = [];

        var cheerio = Meteor.npmRequire("cheerio");
        $ = cheerio.load(torrentzHttpResponse.content);

        $(".results dl").each(function(index, element) {
            if ($(this).find("dt a").attr("href")) {
                var torrent = {};

                torrent["url"] = _this.url + $(this).find("dt a").attr("href");

                torrent["title"] = $(this).find("dt a").html().trim().replace(/\s+/g, " ");
                torrent["category"] = $(this).find("dt").children().remove().end().text().replace(/[^0-9a-zA-Z]/g, " ").trim().replace(/\s+/g, " ");

                torrent["verified"] = $(this).find("dd .v").text().replace(/[^0-9]/g, "");
                torrent["time"] = moment($(this).find("dd .a span").attr("title").trim().replace(/\s+/g, " "), "ddd, DD MMM YYYY HH:mm:ss").format("X");
                torrent["size"] = $(this).find("dd .s").text().replace(/[^0-9a-zA-Z]/g, " ").trim().replace(/\s+/g, " ");
                torrent["peers"] = $(this).find("dd .u").text().replace(/[^0-9]/g, "");
                torrent["seeds"] = $(this).find("dd .d").text().replace(/[^0-9]/g, "");

                torrents.push(torrent);
            }
        });

        return torrents;
    } else return "error";
}

Torrentz.prototype.getView = function(url) {
    var _this = this;

    this.url = (url) ? url : "http://torrentz.in/_";

    var torrentzHttpResponse = HTTP.get(this.url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_2 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8H7 Safari/6533.18.5"
        },
        timeout: 1000 * 60
    });

    if (torrentzHttpResponse.statusCode === 200) {
        var htmlStrips = [];

        var cheerio = Meteor.npmRequire("cheerio");
        $ = cheerio.load(torrentzHttpResponse.content);

        $(".download dl").each(function(index, element) {
            if ($(this).find("dd").text().replace(/[^0-9a-zA-Z]/g, " ").trim().replace(/\s+/g, " ") != "Sponsored Link")
                htmlStrips.push($(this).find("dt").html());
        });

        return htmlStrips;
    } else return "error";
}

// crontab

Torrentz.prototype.crontab = function(cmd, objectIndex, timeInterval) {
    var _this = this;

    switch (cmd ? cmd : "start") {
        case "start":
            var index = objectIndex ? objectIndex : Random.id();

            _this.timeIntervalHandle[index] = Meteor.setInterval(function() {
                var inputObject = db_keywords.find({
                    crontabStatus: false,
                    text: {
                        $exists: true
                    }
                }, {
                    limit: 1, // one keyword for one time
                    sort: {
                        createdOn: -1
                    }
                });

                if (0 < inputObject.count()) {
                    inputObject.forEach(function(row) {
                        db_keywords.update({
                            _id: row._id
                        }, {
                            $set: {
                                crontabStatus: true // update to status TRUE
                            }
                        });

                        _this.getData("search", row.text, "http://torrentz.in").forEach(function(result) {
                            var outputObject = db_torrents.find({
                                url: result.url
                            });

                            if (outputObject.count() <= 0) {
                                result.keywords = [row._id];

                                db_torrents.insert(result); // insert NEW
                            } else {
                                outputObject.forEach(function(item) {
                                    // if (-1 == item.torrentz_input.indexOf(row._id)) {
                                    db_torrents.update({
                                        url: item.url
                                    }, {
                                        $addToSet: {
                                            keywords: row._id
                                        }
                                    }, {
                                        multi: true
                                    });
                                    // }
                                });
                            }
                        });
                    });
                } else {
                    db_keywords.update({}, {
                        $set: {
                            crontabStatus: false // updateAll to status FALSE
                        }
                    }, {
                        multi: true
                    });
                }
            }, _this.timeInterval);

            return index;
            break;

        case "stop":
            if (objectIndex) {
                if (_this.timeIntervalHandle[objectIndex]) {
                    Meteor.clearInterval(_this.timeIntervalHandle[objectIndex]);

                    return delete _this.timeIntervalHandle[objectIndex];
                }
            }
            break;
    }

    return false;
}
