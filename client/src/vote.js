'use strict';

angular.module('myApp')
  .controller('VoteCtrl', ['$scope','$http', '$window','Register', 'Authorization', function($scope, $http, $window, Register , Authorization) {
    $scope.updated = false;

    // Temporary Data Storage
    $scope.user = {};
    $scope.user = undefined;
    $scope.userID = undefined;
    $scope.username = undefined;
    $scope.gender = undefined;
    $scope.firstname = undefined;
    $scope.lastname = undefined;
    $scope.userCredibility = undefined; // will be set when 'getBasicUserInfo' is run


    $scope.imagePic = undefined;
    $scope.imageSource = undefined;
    $scope.imageInfo = undefined;
    $scope.imageId = undefined;

    $scope.getBasicUserInfo = function(){
        Register.register.getCloset($scope.username)
        .then(function(data){
            console.log('User Info: ', data)
            // Storing User Info
            $scope.userCredibility = data.userCredibility;
        })
    };

    $scope.getImage = function(){
    	Register.register.randomImage($scope.username)
    	.then(function(data){
            $scope.imagePic = data.image.image;
            $scope.imageSource = data.image.source;
            $scope.imageInfo = data.image.image_name;
            $scope.imageId = data.image.image_id;
    	})
    };

    $scope.username = $window.localStorage.getItem('username');

    $scope.vote = function(voteValue){
    	console.log('$scope.imageId', $scope.imageId, 'current vote', voteValue);
    	Register.register.vote(voteValue, $scope.username, $scope.imageId, $scope.gender)
    	.then(function(data){
    		$scope.updated = true;
            $scope.getImage();
    	})
    };

    // initialize page with image if auth is good
    if(Authorization.authorized) {
        $scope.user = JSON.parse($window.localStorage.getItem('user'));
        $scope.userID = $scope.user.userID;
        $scope.username = $scope.user.username;
        $scope.gender = $scope.user.gender;
        $scope.firstname = $scope.user.firstname;
        $scope.lastname = $scope.user.lastname;
        // $scope.getBasicUserInfo();
        $scope.getImage();
    }

  }]);
