'use strict';

(function(){

    var app = angular.module('app',['ui.router']);

    app.config(['$stateProvider','$urlRouterProvider',function($stateProvider, $urlRouterProvider){
        $stateProvider
            .state('finder_public',{
                templateUrl:'partials/home.html',
                url: '/',
                controller: 'HomeCtrl'
            })
            .state('finder',{
                templateUrl:'partials/logged.html',
                url: '/finder',
                controller: 'MainCtrl'
            })
            .state('finder.playlist',{
                url: '/playlist',
                views: {
                    playlist:{
                        templateUrl: 'partials/playlist.html',
                        controller: 'PlaylistCtrl'
                    }
                }
            })
            .state('finder.playlist.dups',{
                url: '/playlist/:id',
                views: {
                    dups: {
                        templateUrl: 'partials/dups.html',
                        controller: 'DupsCtrl'
                    }
                }
            })
    }]);

    app.controller('AuthCtrl',['$scope', '$rootScope', function($scope, $rootScope){
        $rootScope.access_token = "Bonjour";
        $rootScope.refresh_token = "Bonjour2";
    }])

})();

var access_token;
var refresh_token;
var error;

var userProfileSource = document.getElementById('user-profile-template').innerHTML,
    userProfileTemplate = Handlebars.compile(userProfileSource),
    userProfilePlaceholder = document.getElementById('user-profile');

var playlistsSource = document.getElementById('playlists-template').innerHTML,
    playlistsTemplate = Handlebars.compile(playlistsSource),
    playlistsPlaceholder = document.getElementById('playlists');

var dupsSource = document.getElementById('dups-template').innerHTML,
    dupsTemplate = Handlebars.compile(dupsSource),
    dupsPlaceholder = document.getElementById('dups');

var errorSource = document.getElementById('error-template').innerHTML,
    errorTemplate = Handlebars.compile(errorSource),
    errorPlaceholder = document.getElementById('error');

(function () {

    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while (e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }

    Handlebars.registerHelper('list', function (items, options) {
        var out = "<div class='list-group'>";

        for (var i = 0, l = items.length; i < l; i++) {
            out = out + options.fn(items[i]);
        }

        return out + "</div>";
    });

    var params = getHashParams();

    access_token = params.access_token;
    refresh_token = params.refresh_token;
    error = params.error;

    if (error) {

        errorPlaceholder.innerHTML = errorTemplate({
            err_title: 'Error!',
            err_content: 'There was an error during the authentication. Feel free to <a href="https://github.com/Crocmagnon/Spotify-Duplicate-Finder/issues" class="alert-link">open an issue</a>.'
        });
    } else {
        if (access_token) {
            getPersonnalInfo(true, userProfilePlaceholder, userProfileTemplate);
        } else {
            // render initial screen
            $('#login').show();
            $('#loggedin').hide();
        }

        document.getElementById('get-playlists').addEventListener('click', function () {
            var button = $(this);
            button.addClass('loading');
            $.ajax({
                url: '/get_playlists',
                data: {
                    'access_token': access_token
                }
            }).done(function (data) {
                var pl = data.data.map(function (item) {
                    return {
                        pl_uid: item.owner.id,
                        pl_name: item.name,
                        pl_id: item.id
                    }
                });

                button.removeClass('loading');
                $('#dups').hide();

                playlistsPlaceholder.innerHTML = playlistsTemplate({
                    playlists: pl
                });
            })
        }, false);

        $(document).on('click', '.pl_item', function (e) {
            e.preventDefault();
            var pl_name = $(this).text();
            $('.pl_item').removeClass('active');
            var currentElement = $(this);
            currentElement.addClass('active');
            currentElement.addClass('loading');
            $('#dups').hide();
            $.ajax({
                url: $(this).attr('href'),
                data: {
                    'access_token': access_token
                }
            }).done(function (data) {
                var dups = data.data.map(function (item) {
                    return {
                        dup_trackname: item.track.name,
                        dup_artist: item.track.artists[0].name
                    }
                });
                currentElement.removeClass('loading');
                if (data.data.length > 0) {
                    dupsPlaceholder.innerHTML = dupsTemplate({
                        dups: dups,
                        pl_name: pl_name
                    });
                }
                else {
                    dupsPlaceholder.innerHTML = dupsTemplate({
                        dups: [],
                        message: "No duplicate found.",
                        pl_name: pl_name
                    });
                }
                $('#dups').show();
            })
        });

        $(document).on('click', '#obtain-new-token', function () {
            refreshToken();
        });
    }
})();

function refreshToken() {
    var button = $('#obtain-new-token');
    button.addClass('loading');
    $.ajax({
        url: '/refresh_token',
        data: {
            'refresh_token': refresh_token
        }
    }).done(function (data) {
        access_token = data.access_token;
        button.removeClass('loading');
    });
}

function getPersonnalInfo(first, userProfilePlaceholder, userProfileTemplate) {
    $.ajax({
        url: 'https://api.spotify.com/v1/me',
        headers: {
            'Authorization': 'Bearer ' + access_token
        },
        success: function (response) {
            userProfilePlaceholder.innerHTML = userProfileTemplate(response);

            $('#login').hide();
            $('#obtain-new-token').show();
            $('#loggedin').show();
        },
        error: function (response) {
            if (response.status == 401) {
                if (first) {
                    refreshToken();
                    getPersonnalInfo(false, userProfilePlaceholder, userProfileTemplate);
                }
                else {
                    errorPlaceholder.innerHTML = errorTemplate({
                        err_title: 'Error!',
                        err_content: 'Error while refreshing token. Please <a href="/" class="alert-link">return to login</a>.'
                    });
                }
            }
        }
    });
}
