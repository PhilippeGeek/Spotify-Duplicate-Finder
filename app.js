/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your client secret
var redirect_uri = process.env.CALLBACK; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cookieParser());

app.get('/login', function (req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'playlist-read-private playlist-read-collaborative';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function (req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                // we can also pass the token to the browser to make requests from there
                res.send('<script>window.token = { access_token: "'+access_token+'", refresh_token: "'+refresh_token+'" };</script>')
            } else {
                res.send('<script>window.token = { access_token: "", refresh_token: "" };</script>')
            }
        });
    }
});

app.get('/refresh_token', function (req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))},
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

app.get('/get_playlists', function (req, res) {
    // requesting access token from refresh token
    var access_token = req.query.access_token;
    var next = req.query.next;
    var authOptions = {
        url: next ? next : 'https://api.spotify.com/v1/me/playlists?' + querystring.stringify({
            limit: 50
        }),
        headers: {'Authorization': 'Bearer ' + access_token},
        json: true
    };

    getAllPages(authOptions, [], function (data) {
        res.send({
            'data': data
        });
    });
});

app.get('/pl/:uId/:plId', function (req, res) {
    var plId = req.params.plId;
    var userId = req.params.uId;
    var access_token = req.query.access_token;
    var fields = querystring.stringify({
        fields: 'items(track(id,name,artists(id,name))),next'
    });
    var authOptions = {
        url: 'https://api.spotify.com/v1/users/' + userId + '/playlists/' + plId + '/tracks?' + fields,
        headers: {'Authorization': 'Bearer ' + access_token},
        json: true
    };

    getAllPages(authOptions, [], function (data) {
        var dups = [];
        data.forEach(function (item, index, array) {
            var i = index + 1;
            while (i < array.length) {
                var other = array[i];
                if (item.track.id == other.track.id) {
                    dups.push(item);
                }
                else if (item.track.name.toLowerCase() == other.track.name.toLowerCase() && item.track.artists[0].id == other.track.artists[0].id) {
                    dups.push(item);
                }
                i++;
            }
            array.forEach(function (other, otherIndex) {
            });
        });
        res.send({
            'data': dups
        });
    });
});

function getAllPages(authOptions, data, callback) {
    request.get(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            if (body.next) {
                authOptions.url = body.next;
                getAllPages(authOptions, data.concat(body.items), callback);
            }
            else {
                callback(data.concat(body.items));
            }
        }
    });
}

module.exports = app;
