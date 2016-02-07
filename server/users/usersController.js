var Q = require('q');
var jwt = require('jwt-simple');
var pg = require('pg');

var connectString = process.env.DATABASE_URL ||
  ( /^win/.test(process.platform) )
    ? 'postgres://postgres:password@localhost:5432/closet'
    : 'postgres://localhost:5432/closet';

// Object.prototype.forEach = function(fn) {
// 	for (var p in this) {
// 		fn(this[p], p, this);
// 	}
// };

function pgConnect() {
	var deferred = Q.defer();
  pg.connect(connectString, function (err, client, done){
    if(err){
      deferred.reject(new Error('error connecting to the DB:', err) );
      done();
    } else {
    	deferred.resolve({
    		client: client,
    		done: done
    	})
    }
  })
  return deferred.promise;
};

exports = module.exports = {

	signin: function(req, res, next) {
		var attemptedUsername = req.body.username;
		var attemptedPassword = req.body.password;

		var clientQuery;
		var done;

		var userInfo;

		pgConnect()
			.then(function(connection) {
    		done = connection.done;
    		clientQuery = Q.nbind(connection.client.query, connection.client);

    		return clientQuery(`
					SELECT username,  password, user_id,
								 firstname, lastname, gender,  credibilityScore
						FROM users
							WHERE username = $1`, [attemptedUsername]
    		);
    	})
    	.then(function(result) {
    		if(result.rows.length === 0){
			    res.status(401).json({ answer: 'Invalid Username' });
			    throw new Error('Stop promise chain');
			  }

		    if(attemptedPassword !== result.rows[0].password) {
		      res.status(401).json({ answer: 'Invalid Password' });
			    throw new Error('Stop promise chain');
		    }

    		var user = result.rows[0];

		    userInfo = {
	      	token:            jwt.encode(user.password, 'secret'),
	      	username:         user.username,
          userID:           user.user_id,
          userId:           user.user_id,
	      	user_id:           user.user_id,
	      	firstname:        user.firstname,
				  lastname:         user.lastname,
				  gender:           user.gender,
				  credibilityScore: user.credibilityScore,
          // followers:        []
		    }

        return exports.getFollowers(clientQuery, user.user_id);
    	})
    	.then(function(followers) {
        userInfo.followers = followers;
        return exports.getFollowing(clientQuery, userInfo.userId);
      })
      .then(function(following) {
        userInfo.following = following;

        console.log('userInfo:\n', userInfo);

	      res.status(200).json(userInfo);
        done();
    	})
    	.fail(function(err) {
    		done();
        if (err.message === 'Stop promise chain') {
          console.log('Failed to signin %s', attemptedUsername);
        } else {
          console.log(err);
          next(err);
        }
    	})
		// pg.connect(connectString, function (err, client, done) {
		// 	if(err) {
		// 	  console.error(err);
		// 	} else {
		// 		client.query(`
		// 			SELECT username, password, user_id, firstname, lastname, gender, credibilityScore
		// 				FROM users
		// 					WHERE username = $1`, [attemptedUsername],
		// 		function (err, result){
		// 		  if(result.rows.length === 0){
		// 		    res.status(401).json({ answer: 'Invalid Username' });
		// 		  } else {
		// 		    var username = result.rows[0].username;
		// 		    var password = result.rows[0].password;
		// 		    var user_id = result.rows[0].user_id;
		// 		    var firstname = result.rows[0].firstname;
		// 		    var lastname = result.rows[0].lastname;
		// 		    var gender = result.rows[0].gender;
		// 		    var credibilityScore = result.rows[0].credibilityScore;
		// 		    if(attemptedPassword === password) {
		// 		      var token = jwt.encode(result.rows[0].password, 'secret');
		// 		      res.status(200).json({
		// 		      	token: token,
		// 		      	username: username,
		// 		      	userID: user_id,
		// 		      	firstname: firstname,
		// 					  lastname: lastname,
		// 					  gender: gender,
		// 					  credibilityScore: credibilityScore,
		// 		      });
		// 		    } else {
		// 		      res.status(401).json({ answer: 'Invalid Password' });
		// 		    }
		// 		  }
		// 		})
		// 	}
		// })
	},

	signup: function(req, res, next) {
		var username = req.body.username;
		var password = req.body.password;
		var firstname = req.body.firstname;
		var lastname = req.body.lastname;
		var gender = req.body.gender;
		pg.connect(connectString, function (err, client, done) {
	    done();
      if(err) {
        console.error(err);
      } else {
        client.query('INSERT INTO users (username, password, firstname, lastname, gender) VALUES ($1, $2, $3, $4, $5)', [username, password, firstname, lastname, gender], function (err, result){
          if(err) {
            console.log('not cool man. database error on signup: ', err)
            next(err);
          } else {
            console.log('result: ', result)
            res.status(201).json({ username: username }) // removed token as was undefined for signup
          }
        })  
      }
		}) // pg.connect end
	},

	updateUserInfo: function(req, res, next) {
		var userID = req.body.userID;
		var username = req.body.username;
		var firstname = req.body.firstname;
		var lastname = req.body.lastname;
		pg.connect(connectString, function (err, client, done) {
			client.query('UPDATE users SET username = $2, firstname = $3, lastname = $4, WHERE user_id = $1', [userID, username, firstname, lastname])
			client.query('SELECT username, firstname, lastname FROM users WHERE user_id = $1', [userID], function (err, result){
					done();
          if(err) {
            console.error('error on lookup of user_id: ', err)
            next(err);
          } else {
            res.status(200).json({
              username: username,
              firstname: firstname,
              lastname: lastname
            });
          }
			})
		}) // pg.connect end
	},

	getUserInfo: function(req, res, next) {
		var username = req.body.username;

    var userInfo = {};

    var clientQuery;
    var done;

    pgConnect()
      .then(function(connection) {
        done = connection.done;
        clientQuery = Q.nbind(connection.client.query, connection.client);

        return clientQuery(`
          SELECT * FROM users
            WHERE username = $1`, [username]
        );
      })
      .then(function(result) {
        var user = result.rows[0];
        var userId = result.rows[0].user_id;

        //create a 'userInfo' object to send back to client
        userInfo.userID = user.user_id;
        userInfo.userId = user.user_id;
        userInfo.user_id = user.user_id;
        userInfo.username = user.username;
        userInfo.firstname = user.firstname;
        userInfo.lastname = user.lastname;
        userInfo.gender = user.gender;

        //get all of the current users images
        return clientQuery(`
          SELECT image_name, image_id, type_id, source, image, link_url
            FROM images i, users u
              WHERE i.user_id = u.user_id
                AND u.user_id = $1`, [userInfo.userId]
        );
      })
      .then(function(result) {
        userInfo.pics = result.rows;

        //grab all of the votes for each user pic
        return clientQuery(`
          SELECT images.image_name, images.image_id,
                 votes.gender, votes.upvote, votes.downvote
            FROM images
              INNER JOIN votes
                ON    images.image_id = votes.image_id
                  AND images.user_id=$1`, [userInfo.userId]
        );
      })
      .then(function(result) {
        userInfo.votes = result.rows;
        userInfo.userCredibility = 0;

        // Calculate votes for each pictures and user credibility
        var rows = result.rows;
        var rowsLength = rows.length;

        var pics = userInfo.pics;
        var picsLength = pics.length;

        var i = rowsLength - 1;
        while (i >= 0) {
          var row = rows[i];

          if (row.upvote === 1) {
            userInfo.userCredibility++;

            var x = picsLength - 1;
            while (x >= 0) {
              var pic = pics[x];

              if ( ! pic.upvotes ) {
                pic.upvotes = 0;
              }
              if (row.image_id === pic.image_id) {
                pic.upvotes++;

                if ( ! pic.genderData ) {
                  pic.genderData = {
                    male: {
                      upvotes: 0,
                      downvotes: 0
                    },
                    female: {
                      upvotes: 0,
                      downvotes: 0
                    },
                    other: {
                      upvotes: 0,
                      downvotes: 0
                    }
                  };
                }

                if (row.gender === 'male'){
                  pic.genderData.male.upvotes++;
                }
                if (row.gender === 'female') {
                  pic.genderData.female.upvotes++;
                }
                if (row.gender != 'male' && row.gender != 'female') {
                  pic.genderData.other.upvotes++;
                }

              }

              userInfo.pics[x] = pic;
              x--;
            }

          } else if (row.downvote === 1) {
            userInfo.userCredibility--;

            var y = picsLength - 1;
            while (y >= 0) {
              var pic = pics[y];

              if ( ! pic.downvotes ) {
                pic.downvotes = 0;
              }
              if (row.image_id === pic.image_id) {
                pic.downvotes++;

                if ( ! pic.genderData ) {
                  pic.genderData = {
                    male: {
                      upvotes: 0,
                      downvotes: 0
                    },
                    female: {
                      upvotes: 0,
                      downvotes: 0
                    }, other: {
                      upvotes: 0,
                      downvotes: 0
                    }
                  };
                }
                if (row.gender === 'male') {
                  pic.genderData.male.downvotes++;
                }
                if (row.gender === 'female') {
                  pic.genderData.female.downvotes++;
                }
                if (row.gender != 'male' && row.gender != 'female') {
                  pic.genderData.other.downvotes++;
                }
              }
              
              userInfo.pics[y] = pic;
              y--;
            }
          }

          result.rows[i] = row;
          i--;
        }
        // Calculate votes for each pictures and user credibility
        // for (var i = 0; i < result.rows.length; i++) {
        //   if (result.rows[i].upvote === 1) {
        //     userInfo.userCredibility++;
        //     for (var x = 0; x < userInfo.pics.length; x++) {
        //         if (!userInfo.pics[x].upvotes) userInfo.pics[x].upvotes = 0;
        //         if (result.rows[i].image_id === userInfo.pics[x].image_id) {
        //           userInfo.pics[x].upvotes++;
        //           if (!userInfo.pics[x].genderData) userInfo.pics[x].genderData = {male: {upvotes: 0, downvotes: 0}, female: {upvotes: 0, downvotes: 0}, other: {upvotes: 0, downvotes: 0}};
        //           if (result.rows[i].gender === 'male') userInfo.pics[x].genderData.male.upvotes++
        //           if (result.rows[i].gender === 'female') userInfo.pics[x].genderData.female.upvotes++
        //           if (result.rows[i].gender != 'male' && result.rows[i].gender != 'female') userInfo.pics[x].genderData.other.upvotes++
        //         }
        //       }
        //   } else if (result.rows[i].downvote === 1) {
        //     userInfo.userCredibility--;
        //     for (var y = 0; y < userInfo.pics.length; y++) {
        //       if (!userInfo.pics[y].downvotes) userInfo.pics[y].downvotes = 0;
        //         if (result.rows[i].image_id === userInfo.pics[y].image_id) {
        //           userInfo.pics[y].downvotes++;
        //           if (!userInfo.pics[y].genderData) userInfo.pics[y].genderData = {male: {upvotes: 0, downvotes: 0}, female: {upvotes: 0, downvotes: 0}, other: {upvotes: 0, downvotes: 0}};
        //           if (result.rows[i].gender === 'male') userInfo.pics[y].genderData.male.downvotes++
        //           if (result.rows[i].gender === 'female') userInfo.pics[y].genderData.female.downvotes++
        //           if (result.rows[i].gender != 'male' && result.rows[i].gender != 'female') userInfo.pics[y].genderData.other.downvotes++
        //         }
        //     }
        //   }
        // }

        // Update User Credibility Score in Database for Efficiency When Grabbing Score Later
        return clientQuery(`
          UPDATE users
            SET credibilityScore = $2
              WHERE username = $1`,
          [username, userInfo.userCredibility]
        );
      })
      .then(function(result) {
        return exports.getFollowers(clientQuery, userInfo.userId);
      })
      .then(function(followers) {
        userInfo.followers = followers;
        return exports.getFollowing(clientQuery, userInfo.userId);
      })
      .then(function(following) {
        userInfo.following = following;

        // console.log('userInfo:\n', userInfo);
        res.status(200).json(userInfo);
        done();
      })
      .fail(function(err) {
        done();
        if (err.message === 'Stop promise chain') {
          console.log('Failed to get user info for %s', username);
          next();
        } else {
          console.log(err);
          next(err);
        }
      });
  },

	// getUserInfo: function(req, res, next) {
 //    var username = req.body.username;

 //    pg.connect(connectString, function (err, client, done) {
 //    if(err) {
 //      console.error('error connecting to the DB:', err);
 //    } else {
 //      client.query('SELECT * FROM users WHERE username = $1', [username], function(err, result){
 //        if(err) {
 //          console.error('error on lookup of user_id: ', err)
 //        } else {
 //        var userId = result.rows[0].user_id;
 //        //create a 'userInfo' object to send back to client
 //        var userInfo = {};
 //        userInfo.userID = result.rows[0].user_id;
 //        userInfo.username = result.rows[0].username;
 //        userInfo.firstname = result.rows[0].firstname;
 //        userInfo.lastname = result.rows[0].lastname;
 //        userInfo.gender = result.rows[0].gender;
 //        //get all of the current users images
 //        client.query('SELECT image_name, image_id, type_id, source, image, link_url FROM images i, users u WHERE i.user_id = u.user_id and u.user_id = $1', [userId], function(err, result){
 //        if(err) {
 //          console.error('error fetching closet images: ', err);
 //        } else {
 //          userInfo.pics = result.rows;
 //            //grab all of the votes for each user pic
 //            client.query('SELECT images.image_name, images.image_id, votes.gender, votes.upvote, votes.downvote FROM images INNER JOIN votes ON images.image_id = votes.image_id and images.user_id=$1', [userId], function(err, result){
 //                if(err) {
 //                  console.error('error fetching votes: ', err);
 //              } else {
 //              userInfo.votes = result.rows;
 //              userInfo.userCredibility = 0;
 //              // Calculate votes for each pictures and user credibility               
 //              for (var i = 0; i < result.rows.length; i++) {
 //                if (result.rows[i].upvote === 1) {
 //                  userInfo.userCredibility++;
 //                  for (var x = 0; x < userInfo.pics.length; x++) {
 //                      if (!userInfo.pics[x].upvotes) userInfo.pics[x].upvotes = 0;
 //                      if (result.rows[i].image_id === userInfo.pics[x].image_id) {
 //                        userInfo.pics[x].upvotes++;
 //                        if (!userInfo.pics[x].genderData) userInfo.pics[x].genderData = {male: {upvotes: 0, downvotes: 0}, female: {upvotes: 0, downvotes: 0}, other: {upvotes: 0, downvotes: 0}};
 //                        if (result.rows[i].gender === 'male') userInfo.pics[x].genderData.male.upvotes++
 //                        if (result.rows[i].gender === 'female') userInfo.pics[x].genderData.female.upvotes++
 //                        if (result.rows[i].gender != 'male' && result.rows[i].gender != 'female') userInfo.pics[x].genderData.other.upvotes++
 //                      }
 //                    }
 //                } else if (result.rows[i].downvote === 1) {
 //                  userInfo.userCredibility--;
 //                  for (var y = 0; y < userInfo.pics.length; y++) {
 //                    if (!userInfo.pics[y].downvotes) userInfo.pics[y].downvotes = 0;
 //                      if (result.rows[i].image_id === userInfo.pics[y].image_id) {
 //                        userInfo.pics[y].downvotes++;
 //                        if (!userInfo.pics[y].genderData) userInfo.pics[y].genderData = {male: {upvotes: 0, downvotes: 0}, female: {upvotes: 0, downvotes: 0}, other: {upvotes: 0, downvotes: 0}};
 //                        if (result.rows[i].gender === 'male') userInfo.pics[y].genderData.male.downvotes++
 //                        if (result.rows[i].gender === 'female') userInfo.pics[y].genderData.female.downvotes++
 //                        if (result.rows[i].gender != 'male' && result.rows[i].gender != 'female') userInfo.pics[y].genderData.other.downvotes++
 //                      }
 //                  }
 //                }
 //              }

 //              // Update User Credibility Score in Database for Efficiency When Grabbing Score Later
 //              client.query('UPDATE users SET credibilityScore = $2 WHERE username = $1', [username, userInfo.userCredibility])

 //              res.status(200).json(userInfo);
 //              done();
 //                }
 //            });
 //          }
 //        }) // end of user images query
 //        }
 //      }) //end of userInfo query
 //    }
 //    }) // pg.connect end
 //  },
 
  getFollowers: function(clientQuery, userId) {
    return clientQuery(`
      SELECT users.username, users.user_id, users.firstname,
             users.lastname, users.gender, users.credibilityScore,
             following.follower_id, following.following_id
        FROM users
          INNER JOIN following
            ON    users.user_id = following.follower_id
              AND following.following_id = $1`,
      [userId]
    )
      .then(function(result) {
        var followers = result.rows;

        // Example followers:
        // [
        //   {
        //     username: 'sue',
        //     user_id: 3,
        //     firstname: 'sue',
        //     lastname: 'bob',
        //     gender: 'female',
        //     credibilityscore: 0,
        //     follower_id: 3,
        //     following_id: 2
        //   }
        // ]

        return followers.map(function(follower) {
          return {
            username:         follower.username,
            user_id:          follower.user_id,
            firstname:        follower.firstname,
            lastname:         follower.lastname,
            gender:           follower.gender,
            credibilityScore: follower.credibilityscore,
            follower_id:      follower.follower_id,
            // following_id:     follower.following_id
          };
        });
      })
  },

  getFollowing: function(clientQuery, userId) {
    return clientQuery(`
      SELECT users.username, users.user_id, users.firstname,
             users.lastname, users.gender, users.credibilityScore,
             following.follower_id, following.following_id
        FROM users
          INNER JOIN following
            ON    users.user_id = following.following_id
              AND following.follower_id = $1`,
      [userId]
    )
      .then(function(result) {
        var followings = result.rows;
        // console.log('followings', followings);

        // Example followings:
        // [
        //   {
        //     username: 'sue',
        //     user_id: 3,
        //     firstname: 'sue',
        //     lastname: 'bob',
        //     gender: 'female',
        //     credibilityscore: 0,
        //     follower_id: 3,
        //     following_id: 2
        //   }
        // ]

        return followings.map(function(following) {
          return {
            username:         following.username,
            user_id:          following.user_id,
            firstname:        following.firstname,
            lastname:         following.lastname,
            gender:           following.gender,
            credibilityScore: following.credibilityscore,
            // follower_id:      following.follower_id,
            following_id:     following.following_id
          };
        });
      })
  },

	getBasicUserInfo: function(req, res, next) {
		var username = req.body.username;

    var userInfo = {};

    var clientQuery;
    var done;

    pgConnect()
      .then(function(connection) {
        done = connection.done;
        clientQuery = Q.nbind(connection.client.query, connection.client);

        return clientQuery(`
          SELECT * FROM users
            WHERE username = $1`, [username]
        );
      })
      .then(function(result) {
        var user = result.rows[0];

        //create a 'userInfo' object to send back to client
        userInfo.userID = user.user_id;
        userInfo.userId = user.user_id;
        userInfo.user_id = user.user_id;
        userInfo.username = user.username;
        userInfo.firstname = user.firstname;
        userInfo.lastname = user.lastname;
        userInfo.gender = user.gender;
      })
      .then(function(result) {
        return exports.getFollowers(clientQuery, userInfo.userId);
      })
      .then(function(followers) {
        userInfo.followers = followers;
        return exports.getFollowing(clientQuery, userInfo.userId);
      })
      .then(function(following) {
        userInfo.following = following;
        // console.log('Basic userInfo:\n', userInfo);
        res.status(200).json(userInfo);
        done();
      })
      .fail(function(err) {
        done();
        if (err.message === 'Stop promise chain') {
          console.log('Failed to get user info for %s', username);
        } else {
          console.log(err);
          next(err);
        }
      });
	},

  // getBasicUserInfo: function(req, res, next) {
  //   var username = req.body.username;
  //   pg.connect(connectString, function (err, client, done) {
  //   if(err) {
  //     console.error('error connecting to the DB:', err);
  //   } else {
  //     client.query('SELECT * FROM users WHERE username = $1', [username], function(err, result){
  //       if(err) {
  //         console.error('error on lookup of user_id: ', err)
  //       } else {
  //       var userId = result.rows[0].user_id;
  //       //create a 'userInfo' object to send back to client
  //       var userInfo = {};
  //       userInfo.userID = result.rows[0].user_id;
  //       userInfo.username = result.rows[0].username;
  //       userInfo.firstname = result.rows[0].firstname;
  //       userInfo.lastname = result.rows[0].lastname;
  //       userInfo.gender = result.rows[0].gender;
  //       res.status(200).json(userInfo);
  //       done();
  //       }
  //     }) //end of userInfo query
  //   }
  //   }) // pg.connect end
  // },

	getAllUsers: function(req, res, next) {
		pg.connect(connectString, function (err, client, done) {
			client.query('SELECT user_id, username, firstname, lastname, gender, credibilityScore FROM users', [], function (err, result){
				  done();
          if(err) {
            console.error('error on lookup of all users: ', err)
            next(err);
          } else {
            allUsers = result.rows;
            res.status(200).json(allUsers);
          }
			})	
		}) // pg.connect end
	},

	getTopUsers: function(req, res, next) {
		pg.connect(connectString, function (err, client, done) {
			client.query('SELECT user_id, username, firstname, lastname, gender, credibilityScore FROM users', [], function (err, result){
				  done();
          if(err) {
            console.error('error on lookup of top users: ', err)
            next(err);
          } else {
            topUsers = result.rows;
            // sort users by highest credibility score
            topUsers.sort(function(a, b){
              var scoreA = a.credibilityscore;
              var scoreB = b.credibilityscore;
                if(scoreA > scoreB) return -1;
                if(scoreA < scoreB) return 1;
                return 0;
            })
            res.status(200).json(topUsers);
          }
			})	
		}) // pg.connect end
	},

	addFollower: function(req, res, next) {
		var follower = req.body.follower;
		var following = req.body.following;

    // console.log('follower', follower);
    // console.log('following', following);

    // Example for 'following':
		//   user_id: 1,
	  //   username: 'Tarly',
	  //   firstname: 'Tarly',
	  //   lastname: 'Fass',
	  //   gender: 'male',
	  //   credibilityscore: null

		var clientQuery;
		var done;

		pgConnect()
			.then(function(connection) {
    		done = connection.done;
    		clientQuery = Q.nbind(connection.client.query, connection.client);

    		return clientQuery(`
    			SELECT follower_id FROM following
    				WHERE following_id = $1`,
    			[following.user_id]
    		);
    	})
    	.then(function(result) {
        // console.log('result:', result);
    		var alreadyExists = ( result.rowCount !== 0 );
    		if (alreadyExists) {
    			throw new Error('Stop promise chain');
    		}
    		return clientQuery(`
    			INSERT INTO following (follower_id, following_id)
    				VALUES ($1, $2)`,
    			[follower.userId, following.user_id]
    		);
    	})
    	.then(function(result) {
				console.log('%s is now following %s', follower.username, following.username);

    		res.json({
    			follower: {
    				user_id: follower.user_id,
    				username: follower.username,
    				firstname: follower.firstname,
    				lastname: follower.lastname,
    				gender: follower.gender,
    				credibilityscore: follower.credibilityscore
    			},
    			following: {
    				user_id: following.user_id,
    				username: following.username,
    				firstname: following.firstname,
    				lastname: following.lastname,
    				gender: following.gender,
    				credibilityscore: following.credibilityscore
    			}
    		});
        done();
    	})
    	.fail(function(err) {
    		done();
        if (err.message === 'Stop promise chain') {
          console.log(
            '%s is already following %s',
            follower.username, following.username
          );
          res.json({
            follower: {
              user_id: follower.user_id,
              username: follower.username,
              firstname: follower.firstname,
              lastname: follower.lastname,
              gender: follower.gender,
              credibilityscore: follower.credibilityscore
            },
            following: {
              user_id: following.user_id,
              username: following.username,
              firstname: following.firstname,
              lastname: following.lastname,
              gender: following.gender,
              credibilityscore: following.credibilityscore
            }
          });
        } else {
          console.log(err);
          next(err);
        }
    	})
	}

}