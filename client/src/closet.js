'use strict';

angular.module('myApp')
  .controller('ClosetCtrl', ['$scope','$http', '$window','$state','Register', 'Authorization', '$stateParams', function($scope,$http,$window,$state, Register, Authorization, $stateParams) {
    $scope.header = 'You will find your closet here';
    // $scope.imageUrl = url;
    $scope.search = "-1";
    // $scope.fire = 'https://s-media-cache-ak0.pinimg.com/236x/4a/8b/c7/4a8bc790db90babc2d5346f07e516ddb.jpg';



    // Temporary Data Storage
    $scope.user = {};
    $scope.user = JSON.parse($window.localStorage.getItem('user'));
    $scope.userID = $scope.user.userID;
    $scope.username = $stateParams.username || $scope.user.username;
    $scope.gender = $scope.user.gender;
    $scope.firstname = $scope.user.firstname;
    $scope.lastname = $scope.user.lastname;


    $scope.getUserInfo = function(){
      // Call the factory method which gets a user's images
      //   and votes for those images
      Register.register.getCloset($scope.username)
        .then(function(data){
          console.log('User Info: ', data)
          $scope.user = data;
        })
        .catch(function (err) {
          console.log(err);
        })
    };

    $scope.removeImage = function(imageId, imageName){
      console.log('inside of remove image function');
      console.log('current image ID', imageId);
      console.log('current image NAME', imageName);
      Register.register.removeImage(imageId, imageName)
        .then(function(data){
          console.log(data);
        })
        .catch(function (err) {
          console.log(err);
        })
    };

    $scope.customFilter = function (pic) {
      if (pic.type_id === parseInt($scope.search)) {
        return true;
      }
      else if (parseInt($scope.search) === -1) {
        return true;
      }
      else {
        return false;
      }
    };

    $scope.reloadPage = function(){
      $state.go($state.current, {}, {reload: true});
    };

    $scope.goToProfile = function(user) {
      console.log('Switching to %s\'s profile', user.username);
      Register.register.getCloset(user.username)
        .then(function(data){
          $window.location.href = '/#/profile/' + user.username;
        })
        .catch(function (err) {
          console.log(err);
        })
    }

    // initialize page with closet images if auth is good
    if(Authorization.authorized) {
      $scope.getUserInfo();
    }

  }]);
