var riak = require('./vendor/riak-js').getClient();

var twitter = require('ntwitter');
var twit = new twitter({
  consumer_key: 'YOUR_CONSUMER_KEY',
  consumer_secret: 'YOUR_CONSUMER_SECRET',
  access_token_key: 'YOUR_ACCESS_TOKEN_KEY',
  access_token_secret: 'YOUR_ACCESS_TOKEN_SECRENT'
});

twit.stream('statuses/filter', {'track':'justin bieber'}, function(stream) {
  stream.on('data', function (tweet) {
    var tweetObject = {user: tweet.user.screen_name, tweet: tweet.text, tweeted_at: tweet.created_at}
    var links = [];
    var key = tweet.id_str;
    if (tweet.in_reply_to_status_id_str != null) {
      console.log("Tweet " + key + " is a reply to " + tweet.in_reply_to_status_id_str);
      links.push({tag: 'in_reply_to', bucket: 'tweets', key: tweet.in_reply_to_status_id_str});
    }    
    riak.save('tweets', key, tweetObject, {links: links}, function(error) {
      if (error != null)
        console.log(error);
    });
  });
});
