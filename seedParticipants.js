var mongoose = require('mongoose');
var Promise = require('bluebird');
var fs = require('fs');
var readFile = Promise.promisify(fs.readFile);
var writeFile = Promise.promisify(fs.writeFile);
var appendFile = Promise.promisify(fs.appendFile);
var https = require('https');
var models = require('./models');
var Participant = models.Participant;

function seeder(matches) {
	readFile('./currentIndex.txt').then(function(indexString) {
		index = parseInt(indexString);
		addToDb(matches[index]);
		console.log(index);
		writeFile('./currentIndex.txt', String(++index));
  }).catch(function(err){
		console.log('error');
		throw err;
	});
}

var matchPath = './AP_ITEM_DATASET/5.14/NORMAL_5X5/';
readFile(matchPath + 'NA.json').then(function(matches) {
  matches = JSON.parse(matches);
	setInterval(seeder, 1250, matches);
});

//daf26bdd-8fb1-4722-b26c-496eed56edbc
function addToDb(match) {
  https.get('https://na.api.pvp.net/api/lol/na/v2.2/match/' + match + '?includeTimeline=true&api_key=daf26bdd-8fb1-4722-b26c-496eed56edbc', function(res) {
    var matchData = '';
    res.on('data', function(dataChunk) {
      matchData += dataChunk;
    });

    res.on('end', function(){
      matchData = JSON.parse(matchData);
      matchData.participants.forEach(function(p) {
        var stats = p.stats;
        var participant = {
          matchID: matchData.matchId,
          champion: p.championId,
          lane: p.timeline.lane,
          items: [stats.item0, stats.item1, stats.item2, stats.item3, stats.item4, stats.item5, stats.item6],
          winner: stats.winner,
          magicDamage: stats.magicDamageDealt,
          magicDamageToChamps: stats.magicDamageDealtToChampions,
          totalDamageToChamps: stats.totalDamageDealtToChampions,
          kills: stats.kills,
          deaths: stats.deaths,
          assists: stats.assists,
          postPatch: true
        };
        Participant.create(participant, function(err, data) {
          if(err){
            appendFile('erroredMatch.txt', match).then(function(){
            	console.log("match index:" + match + " errored! appended index to file");
            }).catch(function(){
							console.log("\007");
            	console.log('appendfile failed on match index: ' + match);
            });
          }
        });
      });
    });
  }).on('error', function(err) {
		appendFile('erroredMatch.txt', match).then(function(){
			console.log("match index:" + match + " errored!");
			console.log("\007");
		}).catch(function(){
			console.log('appendfile failed on match index: ' + match);
		});
  });
}
