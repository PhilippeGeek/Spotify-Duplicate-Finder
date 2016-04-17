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

    app.run(['$rootScope', '$state',function($rootScope, $state){
        $rootScope.access_token = "";
        $rootScope.refresh_token = "";
        $rootScope.$watch('access_token',function(newVal, oldVal, scope){
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
            $state.go('finder.playlist.dups',{uid: playlist.owner.id, id: playlist.id})
        }
    }]);

    app.controller("DupsCtrl",['$scope', '$stateParams',function($scope, $stateParams){
        console.log('mldkqjs');
        $scope.uid = $stateParams['uid'];
        $scope.id = $stateParams['id'];
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