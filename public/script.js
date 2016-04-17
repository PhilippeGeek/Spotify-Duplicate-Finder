'use strict';

(function(){

    var app = angular.module('app',['ui.router', 'ngStorage']);

    app.config(['$stateProvider','$urlRouterProvider',function($stateProvider, $urlRouterProvider){
        $stateProvider
            .state('finder_public',{
                templateUrl:'partials/home.html',
                url: '/',
                controller: 'HomeCtrl'
            })
            .state('finder',{
                abstract: true,
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
                    },
                    dups:{
                        template: ''
                    }
                }
            })
            .state('finder.playlist.dups',{
                url: '/:uid/:id',
                views: {
                    'dups@finder': {
                        templateUrl: 'partials/dups.html',
                        controller: 'DupsCtrl'
                    }
                }
            });
        $urlRouterProvider.otherwise("/");
    }]);

    app.run(['$rootScope', '$state', '$localStorage',function($rootScope, $state, $localStorage){
        $rootScope.$storage = $localStorage.$default({
            access_token: "",
            refresh_token: ""
        });
        $rootScope.access_token = $rootScope.$storage.access_token;
        $rootScope.refresh_token = $rootScope.$storage.refresh_token;

        $rootScope.$watch('access_token', function(newVal, oldVal, scope){

            $rootScope.$storage.access_token = $rootScope.access_token;
            $rootScope.$storage.refresh_token = $rootScope.refresh_token;

            if(oldVal == "" && newVal != ""){
                $state.go('finder.playlist');
            } else if (oldVal != "" && newVal == ""){
                $state.go('finder_public');
            }
        });
        $rootScope.$on('$stateChangeStart',
            function (event, toState) {
                if ((toState.name != "finder_public") && $rootScope.access_token == "") {
                    event.preventDefault();
                    $state.go('finder_public');
                }
            });
    }]);

    app.controller("HomeCtrl",['$scope',function($scope){

    }]);

    app.controller("MainCtrl",['$scope', '$state',function($scope, $state){
        $scope.current = {playlistId: undefined};
    }]);

    app.controller("PlaylistCtrl",['$scope', '$http', '$state',function($scope, $http, $state){
        $scope.playlists = [];
        $scope.load = function(){
            $http.get('/get_playlists', {
                params:{
                    access_token: $scope.access_token
                }
            }).then(function(result){
                var r = result.data;
                if(r.data){
                    $scope.playlists = r.data;
                }
            })
        };
        $scope.open = function(playlist) {
            $scope.current.playlistId = playlist.id;
            $state.go('finder.playlist.dups',{uid: playlist.owner.id, id: playlist.id})
        };
        $scope.load();
    }]);

    app.controller("DupsCtrl",['$scope', '$stateParams', '$http',function($scope, $stateParams, $http){
        $scope.uid = $stateParams['uid'];
        $scope.id = $stateParams['id'];
        $scope.current.playlistId = $scope.id;
        $scope.tracks = [];
        $scope.loaded = false;
        $scope.load = function () {
            $http.get('/pl/' + $scope.uid + '/' + $scope.id, {
                params: {
                    access_token: $scope.access_token
                }
            }).then(function(result) {
                var r = result.data;
                $scope.tracks = r.data;
                $scope.loaded = true;
            });
        };
        $scope.load();
    }]);

    app.controller('AuthCtrl',['$scope', '$rootScope', '$interval', '$http', function($scope, $rootScope, $interval, $http){
        $scope.login = function(){
            var openUrl = '/login';
            window.$windowScope = $scope;
            $scope.popup = window.open(openUrl, "Authenticate Account", "width=500, height=500");
            var checker = $interval(function(){
                if($scope.popup.closed){
                    $interval.cancel(checker);
                } else if ($scope.popup.token != undefined && $scope.popup.token != null) {
                    $rootScope.access_token = $scope.popup.token.access_token;
                    $rootScope.refresh_token = $scope.popup.token.refresh_token;
                    $scope.popup.close();
                    $interval.cancel(checker);
                }
            }, 500);
            return false;
        };
        $scope.refresh = function(){
            if($rootScope.refresh_token)
                $http.get('/refresh_token',{params: {refresh_token: $rootScope.refresh_token}})
                    .then(function(result){
                        $rootScope.access_token = result.data.access_token || "";
                    }, function(failResult){
                        $rootScope.access_token = "";
                        $rootScope.refresh_token = "";
                    });
            return false;
        }
    }])

})();