'use strict';

angular.module('myApp')
  .controller('NavCtrl', ['$scope','$window', '$location', 'Authorization', 'Register', '$state', function($scope, $window, $location, Authorization, Register, $state) {

   $scope.isAuth=Authorization.authorized;

   // data storage
    $scope.user = undefined;
    $scope.userID = undefined;
    $scope.username = undefined;
    $scope.gender = undefined;
    $scope.firstname = undefined;
    $scope.lastname = undefined;

	$scope.image_name = undefined;
	$scope.image = undefined;
	$scope.link_url = undefined;
	$scope.source = undefined;
    $scope.type = undefined;

    // For the nav dropdown
    $scope.showNavDropdown = false;
    $scope.showNavDropdownContent = function() {
        $scope.showNavDropdown = $scope.showNavDropdown === false ? true : false;
    }

   	$scope.firstModalShow = false;
	$scope.changeFirstModal = function() {
		$scope.firstModalShow = $scope.firstModalShow === false ? true : false;
	};

   	$scope.secondModalShow = false;
	$scope.changeSecondModal = function() {
		$scope.secondModalShow = $scope.secondModalShow === false ? true : false;
        $scope.genderShowTypes();
	};

    $scope.femaleShow = false;
    $scope.maleShow = false;
    $scope.genderShowTypes = function() {
        if($scope.gender === 'female') {
            $scope.femaleShow = true;
        } else {
            $scope.maleShow = true;
        }
    };


	$scope.getImageData = function(link) {
    	Register.register.getImageData({ url: link, user_id: $scope.userID })
    	.then(function(data) {
    		$scope.image_name = data.image_name;
    		$scope.image = data.image;
    		$scope.link_url = data.link_url;
    		$scope.source = data.source;
    		$scope.changeFirstModal();
    		$scope.changeSecondModal();
    		console.log('getImageData', data)
    	})
    };

    $scope.getAllImages = function() {
    	Register.register.getAllImages()
    	.then(function(data) {
    		$scope.images = data;
    		console.log('main.js', data)
    		return data;
    	})
    };

    $scope.postImage = function() {
        console.log('here')
    	var imageData = {};
        imageData.type = $scope.type;
    	imageData.userID = $scope.userID;
    	imageData.image_name = $scope.image_name;
        imageData.image = $scope.image;
        imageData.link_url = $scope.link_url;
        imageData.source = $scope.source;
        imageData.type = $scope.type;
        console.log('imageData', imageData)
    	Register.register.postImage(imageData)
    	.then(function(data) {
            $scope.changeSecondModal();
            console.log('loc: ', $location)
            if ($location.$$path === '/closet') {
                $state.reload();
            } else {
                $location.path('closet');
            }
            console.log('data', data)
    		return data; 
    	})
    };

    $scope.goBack = function() {
      $window.history.back();
    }

    if (Authorization.authorized) {
        $scope.user = JSON.parse($window.localStorage.getItem('user'));
        $scope.userID = $scope.user.userID;
        $scope.username = $scope.user.username;
        $scope.gender = $scope.user.gender;
        $scope.firstname = $scope.user.firstname;
        $scope.lastname = $scope.user.lastname;
    }

  }]);
