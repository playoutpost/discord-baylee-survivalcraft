const Discord   = require('discord.js');
const request = require('request');
const rcon    = require('rcon');
const fs      = require('fs');
var ssh       = require('ssh2').Client;
var mysql     = require('mysql');

var config    = require('./config.json');
var botResponses    = require('./responses.json');

const client  = new Discord.Client();

var playerCounts = {};
                    
var embedColors = { 'colors': [ 'd905ff', '33ffff', '00ffa2', 'ffc600', 'ff4200', 'a142f4' ]};

var mysql = mysql.createPool({
  host: config.mysqlip,
  user: config.mysqluser,
  password: config.mysqlpass,
  database: config.mysqldb
});

mysql.getConnection((err, connection) => {
  if (err) {
    console.error(err);
  }
  if (connection) connection.release();
  return;
});

var url = 'http://mcapi.us/server/status?ip=' + config.ip_vanilla + '&port=' + config.port;

function multisearch(text, arrayWords){

   for(var i=0; i<arrayWords.length; i++)
   {
    if(text.indexOf(arrayWords[i]) == -1)
      return false;
   }
   return true;
}

	function delayedchat(msg, message, delay, chain = false)
	{
    client.channels.get(msg.channel.id).startTyping(1);
	  client.setTimeout(function() {
      client.channels.get(msg.channel.id).sendMessage(message)
      .then(function()
            {
              if( chain == false ) client.channels.get(msg.channel.id).stopTyping(true);
              if( chain == true )
              {
                  client.channels.get(msg.channel.id).stopTyping(true);
                  client.channels.get(msg.channel.id).startTyping(true);
              }
            });;
	  }, delay);
	}

	function delayedmessage(msg, message, delay, chain = false) 
	{
    msg.channel.startTyping(1);
	  client.setTimeout(function() {
      msg.author.sendMessage(message)
      .then(function()
            {
              if( chain == false ) msg.channel.stopTyping(true);
              if( chain == true )
              {
                  msg.channel.stopTyping(true);
                  msg.channel.startTyping(true);
              }
            });;
	  }, delay);
	}
  
  function clear_conversation(msg)
  {
    mysql.query('DELETE FROM mc_conversations WHERE discid = "' + msg.author.id + '" LIMIT 1');
  }

	function set_conversation(msg, topic)
	{
		mysql.query('INSERT INTO mc_conversations (discid, topic) VALUES("' + msg.author.id + '", "' + topic + '")');
	}
  
  function player_count(id)
  {
      for (var i = 0, len = playerCounts.length; i < len; i++) {
        if( playerCounts[i].id == id )
        {
            return { name: playerCounts[i].name, count: playerCounts[i].count }; 
        }
      }
  }
  
	function get_conversation(msg)
	{
        mysql.query('SELECT topic FROM mc_conversations WHERE discid = "' + msg.author.id + '" LIMIT 1',
        function(e, result, fields)
        {
          if (e) throw e;
          if( isempty(result[0]) )
          {
            return '';
          }
          else
          {
            return result[0].topic + '';
          }
      });
	}
  
	function set_toggle (msg, toggle)
	{
		mysql.query('UPDATE mc_conversations SET toggle = "' + toggle + '" WHERE discid = "' + msg.author.id + '"');
	}
  
	function get_toggle (msg)
	{
        mysql.query('SELECT toggle FROM mc_conversations WHERE discid = "' + msg.author.id + '" LIMIT 1',
        function(e, result, fields)
        {
          if (e) throw e;
		  
          if(isempty(result[0]))
          {
            return '';
          }
          else
          {
            return result[0].toggle;
          }
		});
	}
  
	function set_callback (msg, toggle)
	{
		mysql.query('UPDATE mc_conversations SET callback = "' + toggle + '" WHERE discid = "' + msg.author.id + '"');
	}
  
	function get_callback (msg)
	{
        mysql.query('SELECT callback FROM mc_conversations WHERE discid = "' + msg.author.id + '" LIMIT 1',
        function(e, result, fields)
        {
          if (e) throw e;
		  
          if(isempty(result[0]))
          {
            return '';
          }
          else
          {
            result[0].callback
          }
		});
	}

	function judgetoggle(response)
	{
		let rspPositive = ['yes', 'yeah', 'sure', 'yup', 'ya', 'yep', 'ok', 'okay'];
		let rspNegative = ['no', 'nope', 'nah', 'na'];
    
    if( rspPositive.includes(response) )
    {
      return 'yes';
    }
    if( rspNegative.includes(response) )
    {
      return 'no';
    }
	}

function doinclude(filename)
{
  eval(fs.readFileSync(filename)+'');
}

function isempty(v)
{
  if( typeof v === 'undefined' )
  {
    return true;
  }
  
  return false;
}

function rconn(server, command, msg)
{
  
  switch( server )
  {
    case 'creative':
      var rconn = new rcon(config.ip_creative, config.rcon_creative_port, config.rcon_creative);
      break;
    
    case 'vfs':
      var rconn = new rcon(config.ip_vanillaplus, config.rcon_vfs_port, config.rcon_vfs_password);
      break;
    
    default:
      var rconn = new rcon(config.ip_vanilla, config.rcon_vanilla_port, config.rcon_vanilla_password);
      break;
  }
  
  
  rconn.on('auth', function() {
    rconn.send(command);
    rconn.disconnect();
  }).on('response', function(str) {
    
    if( !isempty(str) )
    {
      mcrsp = str.replace(/§[0-9A-FK-OR]/ig, '');
      mcrsp = mcrsp.replace(/&[0-9A-FK-OR]/ig, '');
      
      switch( command )
      {
        case 'list':
          mcrsp = mcrsp.replace('online.', 'online.');
          mcrsp = mcrsp.replace('default: ', '');
          mcrsp = mcrsp.replace('Admins: ', '');
          
          return mcrsp;
          break;
        
        default:
          //msg.channel.send(str);
          break;
      }


    }
    
  }).on('end', function() {
    rconn.disconnect();
  }).on('error', function(e) {
    telljavastaff('Server Error: ' + e);
    rconn.disconnect();
  });
  
  rconn.connect();
}

function mysql_query(str)
{
  mysql.query(str, function (err, result) {
    if (err) throw err;
    //console.log(result.affectedRows + " record(s) updated");
  });
}

function mysql_escape (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}
/*
function pecommand(minecraftcommand)
{
  var bedrock = new ssh();
  bedrock.on('ready', function() {
    
    bedrock.exec('screen -r "1318.PE" -p 0 -X stuff "^M' + minecraftcommand + '^M"'  , function(err, stream) {
      if (err) throw err;
      stream.on('close', function(code, signal) { bedrock.end(); })
      .on('data', function(data) {
        //console.log('inside');
        //console.log('STDOUT: ' + data);
        bedrock.end();
        
      }).stderr.on('data', function(data) { console.log(data); bedrock.end();  });
    });
    
    
  }).on('CLOSE', function(reqid, handle) {
            var fnum;
            if (handle.length !== 4 || !openFiles[(fnum = handle.readUInt32BE(0, true))])
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            delete openFiles[fnum];
            sftpStream.status(reqid, STATUS_CODE.OK);
            //console.log('Closing file');
          }).connect({
    host: 'pe.survivalcraft.club',
    port: 22,
    username: 'root',
    password : 'PASSWORD'
  });
}
*/
function logcommand(user, message)
{
  client.channels.get(config.chatid_baylee_log).send('[' + user + '] ' + message);
}
function telljavastaff(message)
{
  client.channels.get(config.chatid_mod_java).send(message);
}
function tellrealmstaff(message)
{
  client.channels.get(config.chatid_mod_realm).send(message);
}

function update()
{
  request('http://survivalcraft.club/stats/players.php', function(err, response, body)
  {
      body = JSON.parse(body);
      var status = ' a restarting server';

      playerCounts = body.servers;

      if(body.players)
      {
          var playercount = 0;
          if(body.players) playercount = body.players.count;
          
          status = playercount + ' players online';
      }
      
      client.user.setActivity(status, { type: 'WATCHING' })
      .then(presence => status)
      .catch(console.error);
  }); //end request
}

client.on('ready', () => {
  console.log('Huggers gonna hug.');
  update(); //set inital update
  client.setInterval(update,5000);
});

client.on('guildMemberAdd', member => {
    var message = 'I\'m Baylee and I\'m your personal assistant at SurvivalCraft. If you want to join one of our servers just say apply.';
    member.user.sendMessage(message);
    
    //member.guild.channels.get(config.chatid_newbies).send(welcome + ' <@' + member.user.id + '>!'); // Make sure you read the <#' + config.channelrules + '> and then fill out our . You can also type **donate** to help support the server.'); 
});

client.on('message', (msg) =>
{
    client.emit('checkMessage', msg);
    
    
    if( msg.author.id == '573121606742835200' ) return;
    //Mention check
    if (msg.isMentioned(client.user))
    {

    } else {
      
      /*
      let keywords = {
        'donate': ['how', 'donate'],
        'apply': ['how', 'apply'],
        'join': ['how', 'join', 'server']
      };
      
      var chatmessage   = msg.content.toLowerCase();
      
      for( var key in keywords )
      {
        var matched       = false;
        var keywordscount  = 0;
        var i;
        
        needle = keywords[key];
        
        //console.log('searching ' + key + ' in ' + chatmessage);
        //console.log(needle);
        
        for (i = 0; i < needle.length; i++) {
          var isthere = chatmessage.search(needle[i]) ;
          if( isthere > -1 ) {
              keywordscount++;
          }
        }
        
        if(keywordscount >= needle.length)
        {
          matched = true;
          
          switch( key )
          {
            case 'join':
            case 'apply':
              //console.log('found how to apply');
              client.channels.get(msg.channel.id).send(msg.author + '? Do you want to join Survival Craft? I sent you a message to help with that.');
              //msg.author.sendMessage('Survival Craft needs your help to keep running. You can donate $1, $5, or any amount and you\'ll get a few perks plus the warm fuzzy feeling of helping run the server. You can see the benefits on the <#' + config.donate.channel + '> page and if you\'re ready to donate you can click here http://donate.survivalcraft.club')
             break;
            case 'donate':
              //console.log('found how to donate');
              client.channels.get(msg.channel.id).send(msg.author + ' it looks like you want to donate? I sent you some information about the perks of donating.');
              //msg.author.sendMessage('Survival Craft needs your help to keep running. You can donate $1, $5, or any amount and you\'ll get a few perks plus the warm fuzzy feeling of helping run the server. You can see the benefits on the <#' + config.donate.channel + '> page and if you\'re ready to donate you can click here http://donate.survivalcraft.club')
              break;
          }
          
          
        }
        
        if( matched ) return;
        
      }
      
      if( matched ) return;
      
      */
      
      
      //End donation checker
         
      //Application progress checker
      if( !msg.guild )
      {
        mysql.query('SELECT topic, toggle, callback FROM mc_conversations WHERE discid = "' + msg.author.id + '" LIMIT 1',
        function(e, result, fields)
        {
          if (e) throw e;
          if( isempty(result[0]) )
          {
              handleChat(msg, true);
          }
          else
          {
            var conv = result[0];
            
            switch( conv.topic )
            {
              /* -- MOVED
              case 'news':
              case 'event':
                response 	= String(msg.content);
                chatmsg   = response;
                response 	= response.toLowerCase();
                
                
                if(response == 'stop' || response == 'cancel')
                {
                  clear_conversation(msg);
                  delayedmessage(msg, 'Alright, consider it canceled.', 3000);
                }
                else
                {
                  if( conv.toggle == 'headline' )
                  {
                    var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];

                    newspost = new Discord.RichEmbed()
                      .setColor('#' + color)
                      .setTitle(conv.callback)
                      .setDescription(chatmsg)
                      .addField('__________', 'Posted by ' + msg.author.toString(), true)
                      .setTimestamp();
                      
                      if( conv.topic == 'news' )
                      {
                        newspost.setFooter('Please don\'t respond to Baylee. Only respond to the person posting it.');
                        client.channels.get(config.chatid_news).send('@everyone __' + conv.callback + '__');
                        client.channels.get(config.chatid_news).send(newspost);
                      }
                      else
                      {
                        client.channels.get(config.chatid_events).send('@everyone __' + conv.callback + '__');
                        client.channels.get(config.chatid_events).send(newspost).then(function(message) {
                          message.react("👍");
                        });
                      }

                    delayedmessage(msg, 'Perfect, I posted it.', 3000);
                    clear_conversation(msg);
                  }
                  else
                  {
                    set_toggle(msg, 'headline');
                    set_callback(msg, chatmsg);
                    
                    delayedmessage(msg, 'Alright, I got the title set. Tell me the message you want to post.', 3000);
                  }
                }
                break;
              */
              
              case 'link': //Link to Minecraft
                response 	= String(msg.content);
                chatmsg   = response;
                response 	= response.toLowerCase();
                
                if(response == 'stop' || response == 'cancel')
                {
                  clear_conversation(msg); 
                  delayedmessage(msg, 'okay, if you wan\'t to connect your accounts later just say link', 3000);
                }
                else
                {
                  if(conv.toggle == 'link') {
                    //we're asking a yes or no question
                    switch(judgetoggle(response))
                    {
                      case 'no':
                        mysql.query('DELETE FROM mc_links WHERE discid = "' + msg.author.id + '" LIMIT 1',
                        function(e, result, fields)
                        {
                          mysql.query('INSERT INTO mc_links (discid, username) VALUES("' + msg.author.id + '", "' + mysql_escape(conv.callback) + '")');
                          //const guildMember = msg.member;
                          //guildMember.addRole('584949617926602773');
                        });
                        
                        delayedmessage(msg, 'perfect! i\'ve connected your minecraft account **' + conv.callback + '** to your discord.', 3000);
                        clear_conversation(msg);
                        break;
                      
                      case 'yes':
                        delayedmessage(msg, 'okay, what\'s your minecraft username?', 3000);
                        set_toggle(msg, '');
                        break;
                      
                      default:
                        delayedmessage(msg, 'sorry, i don\'t understand. do you want to change your username?', 3000);
                        break;
                    }
                  }
                  else
                  {
                    request({
                      url: 'https://api.mojang.com/users/profiles/minecraft/' + chatmsg + '?at=0',
                      json: true
                    }, function (error, retrn, body) {
                    
                      if (!error && retrn.statusCode === 200) {
                        mysql.query('DELETE FROM mc_links WHERE discid = "' + msg.author.id + '" LIMIT 1',
                        function(e, result, fields)
                        {
                          mysql.query('INSERT INTO mc_links (discid, username) VALUES("' + msg.author.id + '", "' + mysql_escape(chatmsg) + '")');
                        });
                        
                        delayedmessage(msg, 'perfect! i\'ve connected your minecraft account **' + chatmsg + '** to your discord.', 3000);
                        clear_conversation(msg);
                      }
                      else
                      {
                        delayedmessage(msg, 'okay so don\'t panic', 1000, true);
                        delayedmessage(msg, 'but i couldn\'t find your name with mojang', 3000, true);
                        delayedmessage(msg, 'this is probably a mistake and everything is fine', 6000, true);
                        delayedmessage(msg, 'anyway, you said your username is **' + chatmsg + '**', 8000, true);
                        delayedmessage(msg, 'double check that and make sure it\'s spelled correctly', 10000, true);
                        delayedmessage(msg, 'do you need to change your username?', 13000);
                        set_toggle(msg, 'link');
                        set_callback(msg, chatmsg);
                      }
                    });
                  }
                }
                break;
              
              case 'apply': //Application Conversation
                response 	= String(msg.content);
                response 	= response.toLowerCase();
                
                if(response == 'stop' || response == 'cancel')
                {
                  clear_conversation(msg);
                  set_toggle(msg, '');
                  set_callback(msg, '');
                  delayedmessage(msg, 'okay, i stopped the application. if you want to apply again just say apply.', 3000);
                }
                else
                {
                  mysql.query('SELECT * FROM applications WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1',
                  function(e, result, fields)
                  {
                    if (e) throw e;
                    
                    response 	= String(msg.content);
                    chatmsg   = response;
                    response 	= response.toLowerCase();
                    result 		= result[0];
                    
                    
                    if( isempty(result) ) { return; }
                  
                    if( result.ign == '' )
                    {
                      if( response !== 'apply' )
                      {
                        if(conv.toggle == 'ign') {
                          //we're asking a yes or no question
                          switch(judgetoggle(response))
                          {
                            case 'no':
                              mysql.query('UPDATE applications SET ign = "' + mysql_escape(conv.callback) + '"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                              delayedmessage(msg, 'nice to meet you **' + conv.callback + '**. next, how old are you?', 3000);
                              set_toggle(msg, '');
                              set_callback(msg, '');
                              break;
                            
                            case 'yes':
                              delayedmessage(msg, 'okay, what\'s your minecraft username?', 3000);
                              set_toggle(msg, '');
                              break;
                            
                            default:
                              delayedmessage(msg, 'sorry, i don\'t understand. do you want to change your username?', 3000);
                              break;
                          }
                        }
                        else
                        {
                          request({
                            url: 'https://api.mojang.com/users/profiles/minecraft/' + chatmsg + '?at=0',
                            json: true
                          }, function (error, retrn, body) {
                          
                            if (!error && retrn.statusCode === 200) {
                              mysql.query('UPDATE applications SET ign = "' + mysql_escape(chatmsg) + '"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                              delayedmessage(msg, 'nice to meet you **' + chatmsg + '**. next, how old are you?', 3000);
                            }
                            else
                            {
                              delayedmessage(msg, 'okay so don\'t panic', 1000, true);
                              delayedmessage(msg, 'but i couldn\'t find your name with mojang', 3000, true);
                              delayedmessage(msg, 'this is probably a mistake and everything is fine', 6000, true);
                              delayedmessage(msg, 'anyway, you said your username is **' + chatmsg + '**', 8000, true);
                              delayedmessage(msg, 'double check that and make sure it\'s spelled correctly', 10000, true);
                              delayedmessage(msg, 'do you need to change your username?', 13000);
                              set_toggle(msg, 'ign');
                              set_callback(msg, chatmsg);
                            }
                          });
                        }
                      }
                      return;
                    }
                    
                    if( result.age == '' )
                    {
                      if( !response.match(/^[0-9]+$/) )
                      {
                       delayedmessage(msg, 'sorry, i don\'t understand. are you like 16, 18, etc..?', 3000);
                      }
                      else
                      {
                        mysql.query('UPDATE applications SET age = "' + mysql_escape(response) + '"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                        delayedmessage(msg, 'got it!', 1000, true);
                        delayedmessage(msg, 'okay so we have java edition servers for pc', 3000, true);
                        delayedmessage(msg, 'we also have realms for xbox, pocket edition, and nintendo switch', 5000, true);
                        delayedmessage(msg, 'which would would you like to play on? realms or java?', 7000);
                      }
                      return;
                    }
                    
                    if( result.platform == '' )
                    {
                      switch(response)
                      {
                        case 'realm':
                        case 'java':
                          mysql.query('UPDATE applications SET platform = "' + mysql_escape(response) + '"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                          delayedmessage(msg, 'alright, we\'re almost done! can you tell me why you want to play on our minecraft servers?', 3000);
                          break;
                        
                        default:
                          delayedmessage(msg, 'sorry, i didn\'t understand that. do you want to play on java or realm?', 3000);
                          break;
                      }
                      return;
                    }
                    
                    if( result.why == '' )
                    {
                      if( response.length < 20 )
                      {
                        delayedmessage(msg, 'sorry, we\'re looking for just a bit more info. can you tell me why you want to play on our servers?', 3000);
                      }
                      else
                      {
                        mysql.query('UPDATE applications SET why = "' + mysql_escape(response) + '"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                        delayedmessage(msg, 'now we don\'t allow griefing and we have plugins that monitor our servers', 2000, true);
                        delayedmessage(msg, 'the "my brother/sister/cousin/uncle was on my account" excuse doesn\'t work here', 5000, true);
                        delayedmessage(msg, 'if someone is caught then they are removed from the server', 9000, true);
                        delayedmessage(msg, 'do you agree to our anti-grief rules?', 13000);
                      }
                      return;
                    }
                    
                    if( result.antigrief == '' )
                    {
                      mysql.query('UPDATE applications SET antigrief = "' + mysql_escape(response) + '"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                      delayedmessage(msg, 'last question, did you read the rest of the <#' + config.chatid_rules + '> and do you agree to obey them?', 3000);
                      return;
                    }
                    
                    if( result.rules == '' )
                    {
                      mysql.query('UPDATE applications SET rules = "' + mysql_escape(response) + '"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                      
                        delayedmessage(msg, 'that\'s all the questions!', 2000, true);
                        delayedmessage(msg, 'but before i can submit your application, i\'ll need you to send me at least one picture of something you\'ve built', 5000, true);
                        delayedmessage(msg, 'i will wait here while you get your pic ready', 9000);
                      return;
                    }
                    
                    if( !msg.attachments.size )
                    {
                      delayedmessage(msg, 'uh oh, that didn\'t work. please upload your picture again', 3000);
                    }
                    else
                    {
                      var images = '';
                      var submitted = false;
                      msg.attachments.forEach(a => {
                        
                        images = a.proxyURL;
                        
                        if( !submitted )
                        {
                          mysql.query('UPDATE applications SET image = "' + images + '", status = "submitted"  WHERE appid = "' + msg.author.id + '" AND status = "pending" LIMIT 1');
                          
    
                          if( result.platform == 'java' )
                          {
                            client.channels.get(config.chatid_app_java).send('New Application @everyone');
                            newapp = new Discord.RichEmbed()
                              .setColor('#0099ff')
                              .setTitle('New Application')
                              .setThumbnail(images)
                              .addField('What\'s your minecraft username?', result.ign)
                              .addField('How old are you?', result.age)
                              .addField('Which server?', result.platform)
                              .addField('Why do you want to play on here?', result.why)
                              .addField('Do agree to not grief?', result.antigrief)
                              .addField('Have you read the rules?', result.rules)
                              .addBlankField()
                              .addField('Actions:', '[:white_check_mark: Approve](http://approve.survivalcraft.club/' + msg.author.id + ') [:no_entry_sign: Reject](http://reject.survivalcraft.club/' + msg.author.id + ')')
                              .setFooter('If you reject a player, please message them and tell them why.');
                        
                            client.channels.get(config.chatid_app_java).send(newapp);
                          }
                          else
                          {
                            client.channels.get(config.chatid_app_realm).send('New Application @everyone');
                            newapp = new Discord.RichEmbed()
                              .setColor('#FF5400')
                              .setTitle('New Application')
                              .setThumbnail(images)
                              .addField('What\'s your xbox live username?', result.ign)
                              .addField('How old are you?', result.age)
                              .addField('Which server?', result.platform)
                              .addField('Why do you want to play on here?', result.why)
                              .addField('Do agree to not grief?', result.antigrief)
                              .addField('Have you read the rules?', result.rules)
                              .addBlankField()
                              .addField('Actions:', '[:white_check_mark: Sent invite](http://approve.survivalcraft.club/' + msg.author.id + ') [:no_entry_sign: Reject](http://reject.survivalcraft.club/' + msg.author.id + ')')
    
                              .setFooter('Add player as a friend and then send an invite to them to join the realm. If you reject a player, please message them and tell them why.');
                        
                            client.channels.get(config.chatid_app_realm).send(newapp);
                          }
                      
                          delayedmessage(msg, 'we\'re done and i submitted your application. someone on staff will review it and i will let you after they look it over.', 3000);
                          clear_conversation(msg);
                      
                          logcommand('<@' + msg.author.id + '>', 'applied for whitelist [' + msg.author.id + '] [' + result.platform + '] username:' + result.ign);
    
                          
                          mysql.query('INSERT INTO mc_links (discid, username) VALUES("' + msg.author.id + '", "' + mysql_escape(result.ign) + '")');
                       
                          submitted = true;
                          return
                        }
                      });
                    }
                    return;
                  
                  });
                }
                return;
                //End Application Conversation
                break;
              
            }
            
            return;
          }
        });
      }
      else
      {
        handleChat(msg, false);
      }
    } //End Mention Check
});

function handleChat(msg, isPrivate)
{
  
  if( isPrivate )
  {
    //normal phrases
    phrases = msg.content.toLowerCase();
    phrases = phrases.replace(/[^a-zA-Z ]+/g, '');
        
    switch(phrases)
    {
      case 'thanks':
      case 'thank you':
        thanked = botResponses.thanked[Math.floor(Math.random() * botResponses.thanked.length)];
        
        delayedmessage(msg, thanked, 1000);
        return;
        break;
      
      case 'hi':
      case 'hey':
        greeting = botResponses.greeting[Math.floor(Math.random() * botResponses.greeting.length)];
        
        delayedmessage(msg, greeting, 1000);
        return;
        break;
    }
  }
  
  if( msg.channel.id == config.chatid_baylee_messages )
  {
    response 	= String(msg.content);
    chatmsg   = response;
    response 	= response.toLowerCase();
    
    mention = response.substring(
        response.lastIndexOf('<@!') + 3, 
        response.lastIndexOf('>')
    ) + '';
    
    chatmsg = chatmsg.replace('<@!'+mention+'>', '');
        
    if( mention.length > 10 )
    {
      client.users.get(mention).send(chatmsg);
      msg.react("✅");
    }
  }
  
  if( msg.channel.id == config.chatid_baylee_research )
  {
    mysql.query('SELECT topic, toggle, callback FROM mc_conversations WHERE discid = "' + msg.author.id + '" LIMIT 1',
    function(e, result, fields)
    {
      if (e) throw e;
      if( !isempty(result[0]) )
      {
        var conv = result[0];
        
        switch( conv.topic )
        {
          case 'poll':
          case 'news':
          case 'event':
          case 'channel':
            response 	= String(msg.content);
            chatmsg   = response;
            response 	= response.toLowerCase();
            
            
            if(response == 'stop' || response == 'cancel')
            {
              clear_conversation(msg);
              delayedchat(msg, 'alright, i canceled it', 3000);
            }
            else
            {
              if( conv.toggle == 'headline' )
              {
                var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
    
                newspost = new Discord.RichEmbed()
                  .setColor('#' + color)
                  
                  .setDescription(chatmsg);
                  
                  switch( conv.topic )
                  {
                    case 'channel':
                      client.channels.get(conv.callback).send(newspost);
                      break;
                    
                    case 'event':
                      newspost.setTitle(conv.callback)
                              .addField('__________', 'posted by ' + msg.author.toString(), true)
                              .setTimestamp();
                      
                      client.channels.get(config.chatid_events).send('@everyone __' + conv.callback + '__');
                      client.channels.get(config.chatid_events).send(newspost).then(function(message) {
                        message.react("👍");
                      });
                      break;
                    
                    case 'poll':
                      newspost.setTitle(conv.callback)
                              .addField('__________', 'posted by ' + msg.author.toString(), true)
                              .setTimestamp();
                              
                      client.channels.get(config.chatid_baylee_test).send('@everyone new poll: __' + conv.callback + '__');
                      client.channels.get(config.chatid_baylee_test).send(newspost).then(function(message) {
                        message.react("👍");
                        message.react("👎");
                      });;
                      break;
                    
                    case 'news':
                    default:
                      newspost.setTitle(conv.callback)
                              .addField('__________', 'posted by ' + msg.author.toString(), true)
                              .setTimestamp();
                              
                      newspost.setFooter('please don\'t respond to baylee. only respond to the "posted by" person');
                      
                      client.channels.get(config.chatid_news).send('@everyone __' + conv.callback + '__');
                      client.channels.get(config.chatid_news).send(newspost);
                      break;
                  }
    
                delayedchat(msg, 'perfect, i posted it', 3000);
                clear_conversation(msg);
              }
              else
              {
                switch( conv.topic )
                {
                  case 'channel':
                      mention = response.substring(
                          response.lastIndexOf('<#') + 2, 
                          response.lastIndexOf('>')
                      );
                      console.log('@' + response + '@');
                      console.log('@' + mention + '@');
                      
                    if( mention.length > 10 )
                    {
                      set_toggle(msg, 'headline');
                      set_callback(msg, mention);
                      
                      delayedchat(msg, 'alright, tell me the message you want to post', 3000);
                    }
                    else
                    {
                      console.log('done');
                      delayedchat(msg, 'sorry, you have to tag a channel to post in', 3000);
                    }
                    break;
                  
                  case 'poll':
                    set_toggle(msg, 'headline');
                    set_callback(msg, chatmsg);
                    
                    delayedchat(msg, 'alright, tell me the message for the poll', 3000);
                    break;

                  default:
                    set_toggle(msg, 'headline');
                    set_callback(msg, chatmsg);
                    
                    delayedchat(msg, 'alright, tell me the message you want to post', 3000);
                    break;
                }
              }
            }
        }
      }
    });
  }
  
  //Start command parser
  phrases = msg.content.toLowerCase();
  
  nmsg = phrases.split(' ');
  const [keyword, ...args] = nmsg;
  
  switch(phrases)
  {
    case 'hi baylee':
    case 'hey baylee':
      greeting = botResponses.greeting[Math.floor(Math.random() * botResponses.greeting.length)];
      
      delayedchat(msg, greeting, 1000);
      return;
      break;
    
    case 'all players':
    case 'players all':
      var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
      
      playercount = 0;
      
      playerEmbed = new Discord.RichEmbed()
        .setColor('#' + color);
      
      for (var i = 0, len = playerCounts.length; i < len; i++) {
        if( playerCounts[i].count > 0 )
        {
          playerEmbed.addField(playerCounts[i].name, playerCounts[i].count + ' online', true);
          playercount += playerCounts[i].count;
        }
      }
      
      playerEmbed.setTitle('<:minecraft:574155269752225802> ' + playercount + ' Player Online')
                  .setTimestamp();
      msg.channel.send(playerEmbed);
      return;
      break;
    
    case 'players':
      var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
      
      console.log( msg.channel.id );
      switch( msg.channel.id )
      {
        case config.chatid_casual:
          playerkey = config.realm_casual;
          break;
        case config.chatid_clans:
          playerkey = config.realm_clans;
          break;
        case config.chatid_reborn:
          playerkey = config.realm_reborn;
          break;
        case config.chatid_vanilla:
          playerkey = config.ip_vanilla;
          break;
        case config.chatid_vanillaplus:
        default:
          playerkey = config.ip_vanillaplus;
          break;
      }
      
      players = player_count(playerkey);
      
      rconEmbed = new Discord.RichEmbed()
        .setColor('#' + color)
        .setTitle('<:minecraft:574155269752225802> ' + players.name)
        .setDescription('There are **' + players.count + '** players online');
      msg.channel.send(rconEmbed);
    return;
    break;
    
    case 'colours':
    case 'colors':
      var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
      
      colorsEmbed = new Discord.RichEmbed()
      .setColor('#' + color)
      .setURL('http://donate.survivalcraft.club/')
      .addField('color codes', '<:sc_colorsred:580272659519242250> Red **&c**\n<:sc_colorsdarkred:580272659246612486> Dark Red **&4**\n<:sc_colorsgold:580272659376504865> Gold **&6**\n<:sc_colorsyellow:580272659485687819> Yellow **&e**\n<:sc_colorsdarkgreen:584789497452036106> Dark Green **&2**\n<:sc_colorsgreen:580272659493945354> Green **&a**\n<:sc_colorsaqua:580272659405733918> Aqua **&b**\n<:sc_colorsdarkaqua:580272659393413121> Dark Aqua **&3**', true)
      .addField('color codes', '<:sc_colorsdarkblue:580272659074646018> Dark Blue **&1**\n<:sc_colorsindigo:584789497565282326> Indigo **&9**\n<:sc_colorspink:584789497464487946> Pink **&d**\n<:sc_colorspurple:580272659493814285> Purple **&5**\n<:sc_colorswhite:580272659498270720> White **&f**\n<:sc_colorsgray:580272659477037056> Gray **&7**\n<:sc_colorsdarkgray:580272659401801730> Dark Gray **&8**\n<:sc_colorsblack:580272659514785792> Black **&0**',  true)
      .addField('formatting', '<:sc_colorsfstrike:580272659473104896> Strikethrough **&m**\n<:sc_colorsfunderlinen:580272659342819330> Underline **&n**\n<:sc_colorsfbold:580272659481493504> Bold **&l**', true)
      .addField('formatting', '<:sc_colorsfitalic:580272659510853642> Italic **&o**\n<:sc_colorsfmagic:580272659472842762> Magic **&k**', true)
      
      msg.channel.send(colorsEmbed);
    return;
    break;
    
    case 'donate':
    delayedmessage(msg, 'we need your help to keep running and free for everyone. you can donate $1, $5, or any amount and you\'ll get a perks too! check out <#' + config.chatid_donate + '> or you can donate using http://donate.survivalcraft.club', 3000);
    return;
    break;
    
    case 'help':
    var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];

    helpEmbed = new Discord.RichEmbed()
    .setColor('#' + color)
    .setTitle('baylee\'s commands')
    .setDescription('you can also talk to me. try it out by saying; baylee how are you?', true)
    .addField('**apply**', ' apply to join', true)
    .addField('**link**', ' discord to minecraft link', true)
    .addField('**settings**', ' change your settings', true)
    .addField('**ip**', ' all ip addresses', true)
    .addField('**colors**', ' formatting and color codes', true)
    .addField('**donate**', ' learn out about perks', true)
    .addField('**players** or **all players**', ' shows players online', true)
    .addField('**seen thecenters**', ' see last online time', true)
    .addField('**hey baylee**', ' start talking with me', true)
    .setFooter('to lower spam, please use these commands in a private message');
    
    msg.channel.send(helpEmbed);
    return;
    break;
    
    case 'apply':
    set_conversation(msg, 'apply');
    mysql.query('DELETE FROM applications WHERE appid = "' + msg.author.id + '" LIMIT 1',
    function(e, result, fields)
    {
      mysql.query('INSERT INTO applications (appid, status) VALUE("' + msg.author.id + '", "pending")');
      
      delayedmessage(msg, 'hey let\'s get your application going for survivalcraft!', 2000, true);
      delayedmessage(msg, 'it should only take about 2 minutes and if want to cancel just say cancel', 5000, true);
      delayedmessage(msg, 'so what\'s your minecraft username?', 8000);
    });
    return;
    break;
    
    case 'link':
    set_conversation(msg, 'link');
      delayedmessage(msg, 'hey let\'s connect your discord account to your minecraft account!', 2000, true);
      delayedmessage(msg, 'it should only take about 1 minute and if want to cancel just say cancel', 5000, true);
      delayedmessage(msg, 'so what\'s your minecraft username?', 8000);
    return;
    break;
    
    case 'ip':
      var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
      
      embedIP = new Discord.RichEmbed()
      .setColor('#' + color)
      .setTitle('survivalcraft java')
      .addField('<:minecraft:574155269752225802> **vanilla plus**', '__' + config.ip_vanillaplus +'__')
      .addField('<:minecraft:574155269752225802> **vanilla**', '__' + config.ip_vanilla +'__')
      .addField('<:minecraft:574155269752225802> **creative**', '__' + config.ip_creative +'__ <#' + config.chatid_donate + '>');
      
      msg.channel.send(embedIP);
      return;
    break;
    
  }

  triggerTalk = false;
  
  if( phrases.indexOf('baylee') > -1 )
  {
    if( phrases.indexOf('»') > -1 )
    {
      var tmp = phrases.split('»');
      phrases = tmp[1].trim();
    }
    
    var bayphrase = phrases.replace(/[^0-9a-z ]/gi, '');
    bayphrase = bayphrase.replace(' u ', ' you ');
    var baymsg = bayphrase.split(' ');
    var lastword = baymsg[baymsg.length - 1];
    var firstword = baymsg[0];
    var firstphrase = baymsg[0] + ' ' + baymsg[1];
    
    if( lastword == 'baylee' || firstword == 'baylee' || firstphrase == 'hey baylee' )
    {
      triggerTalk = true;
      triggerPhrase = bayphrase.replace(/hey baylee|baylee/i, '').trim(); 
    }
  }

  if( triggerTalk )
  {
      mention = '';

      switch (triggerPhrase)
      {
        case 'thanks':
        case 'thank you':
          if( !response ) response = botResponses.thanked;
          break;
        
        case 'ily':
        case 'i love you':
          if( !response ) response = botResponses.ily; 
          break;
        
        case 'uwu':
          if( !response ) response = botResponses.uwu; 
          break;
        
        case 'who are you':
          if( !response ) response = botResponses.whoareyou; 
          break;
        
        case 'how are you':
          if( !response ) response = botResponses.howareyou;
          break;
        
        case 'what are you doing':
          if( !response ) response = botResponses.whatareyoudoing;
          break;
        
        case 'rap':
          if( !response ) response = botResponses.rap;
          break;
        
        case 'version':
          if( !response ) response = botResponses.version;
          break;
        
        case 'facts':
          if( !response ) response = botResponses.facts; 
          break;
        
        case 'tips':
          if( !response ) response = botResponses.tips; 
          break;
        
        case 'yes':
          if( !response ) response = botResponses.yes; 
          break;
        
        case 'no':
          if( !response ) response = botResponses.no; 
          break;
        
        case 'is centers god':
          if( !response ) response = botResponses.centersgod; 
          break;
        
        case 'who is carl':
          if( !response ) response = botResponses.carlwho; 
          break;
      
        case 'can you':
          if( !response ) response = botResponses.canyou; 
          break;
        
        case 'what version':
          if( !response ) response = botResponses.version; 
          break;
        
        case 'when is':
          if( !response ) response = botResponses.whenis; 
          break;
        
        case 'why do':
          if( !response ) response = botResponses.whydo; 
          break;
        
        case 'madlib':
          if( !response ) response = botResponses.madlib;
      }      
            
      if( multisearch(phrases, ['marry', 'me']) )
      {
        if( !response ) response = botResponses.marryme;
      }
      
      if( multisearch(phrases, ['hate', 'you']) )
      {
        if( !response ) response = botResponses.hateyou;
      }
      
      if( multisearch(phrases, ['why', 'do']) )
      {
        if( !response ) response = botResponses.whydo;
      }
      
      if( multisearch(phrases, ['why', 'did']) )
      {
        if( !response ) response = botResponses.whydid;
      }
      
      if( multisearch(phrases, ['why', 'are']) )
      {
        if( !response ) response = botResponses.whyare; 
      }
      
      if( multisearch(phrases, ['do', 'you', 'know']) )
      {
        if( !response ) response = botResponses.doyouknow; 
      }
      
      if( multisearch(phrases, ['do', 'you']) )
      {
        if( !response ) response = botResponses.doyou; 
      }
      
      if( multisearch(phrases, ['are', 'you']) )
      {
        if( !response ) response = botResponses.areyou;
      }
               
          console.log(mention);       
      if( !response ) response = botResponses.madlib; 
      

      
      response = response[Math.floor(Math.random() * response.length)] + " ";
      
      me =          botResponses.me[Math.floor(Math.random() * botResponses.me.length)];
      im =          botResponses.im[Math.floor(Math.random() * botResponses.im.length)];
      adjective =   botResponses.adjective[Math.floor(Math.random() * botResponses.adjective.length)];
      adverb =      botResponses.adverb[Math.floor(Math.random() * botResponses.adverb.length)];
      verb =        botResponses.verb[Math.floor(Math.random() * botResponses.verb.length)];
      verb_action = botResponses.verb_action[Math.floor(Math.random() * botResponses.verb_action.length)];
      noun_person = botResponses.noun_person[Math.floor(Math.random() * botResponses.noun_person.length)];
      noun_place =  botResponses.noun_place[Math.floor(Math.random() * botResponses.noun_place.length)];
      noun_thing =  botResponses.noun_thing[Math.floor(Math.random() * botResponses.noun_thing.length)];
      pronoun =     botResponses.pronoun[Math.floor(Math.random() * botResponses.pronoun.length)];
      
      response = response.replace(/%me%/g, me)
                         .replace(/%im%/g, im)
                         .replace(/%adjective%/g, adjective)
                         .replace(/%adverb%/g, adverb)
                         .replace(/%verb%/g, verb)
                         .replace(/%verb_action%/g, verb_action)
                         .replace(/%noun_person%/g, noun_person)
                         .replace(/%noun_place%/g, noun_place)
                         .replace(/%noun_thing%/g, noun_thing)
                         .replace(/%pronoun%/g, pronoun);
      
      delayedchat(msg, response, 1000);
      
      return;
  }
  
  switch(keyword)
  {    
    case 'clear':
      if( msg.member.hasPermissions("VIEW_AUDIT_LOG") )
      {
        
      }
      return;
      break;
    
    case 'lookup':
      var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
      
      if( msg.channel.id == config.chatid_baylee_research || msg.channel.id == config.chatid_baylee_test )
      {
        mysqlquery = '';
        
        taggedUser = args[1] + "";
        page = args[2] + "";
        
        if( isempty(page) )
        {
          offset = 1; 
        }
        else
        {
          if(isNaN(page)) page = 1;
          
          offset = (parseInt(page) * 10) - 10;
        }
        
        switch(args[0])
        {
          case 'apps':
            mysqlquery = 'SELECT CONCAT("[", platform, "](http://api.survivalcraft.club/app/", appid , ")") AS prefix, ign AS user, "" AS message FROM applications WHERE status = "submitted" LIMIT 10';
            break;
          
          case 'discord':
            mysqlquery = 'SELECT "Discord" AS prefix, username AS user, CONCAT("<@", discid, ">") AS message FROM mc_links WHERE username LIKE "' + mysql_escape(taggedUser) + '%" LIMIT 1';
            break;
          
          case 'location':
          case 'locations':
            mysqlquery = 'SELECT * FROM ( SELECT FROM_UNIXTIME(s.time, "%b %d %l:%i %p") AS prefix, u.user, CONCAT("X: ", s.x, ", Y: ", s.y, ", Z: ", s.z) AS message, s.time FROM co_session AS s INNER JOIN co_user AS u ON s.user = u.rowid  WHERE u.user LIKE "' + mysql_escape(taggedUser) + '%" ORDER BY s.time DESC LIMIT 0, 20 ) AS m ORDER BY time ASC';
            break;
          
          case 'command':
          case 'commands':
            mysqlquery = 'SELECT * FROM ( SELECT FROM_UNIXTIME(c.time, "%b %d %l:%i %p") AS prefix, u.user, c.message, c.time FROM co_command AS c INNER JOIN co_user AS u ON c.user = u.rowid  WHERE u.user LIKE "' + mysql_escape(taggedUser) + '%" ORDER BY c.time DESC LIMIT ' + offset + ', 20 ) AS m ORDER BY time ASC';
            break;
        
          case 'chat':
            mysqlquery = 'SELECT * FROM ( SELECT FROM_UNIXTIME(c.time, "%b %d %l:%i %p") AS prefix, u.user, c.message, c.time FROM co_chat AS c INNER JOIN co_user AS u ON c.user = u.rowid  WHERE u.user LIKE "' + mysql_escape(taggedUser) + '%" ORDER BY c.time DESC LIMIT ' + offset + ', 20 ) AS m ORDER BY time ASC';
            break;
        }

        if( mysqlquery )
        {
          mysql.query(mysqlquery,
          function(e, result, fields)
          {
            if (e) throw e;
            
            if( result === undefined || result.length == 0 )
            {
              delayedchat(msg, 'can\'t find anything for *' + taggedUser + '*', 1000);
            }
            else
            {
              chatlog = '';
              
              for (var i = 0, len = result.length; i < len; i++) {
                chatlog = chatlog + '[' + result[i].prefix + '] ' + result[i].user + ': ' + result[i].message + '\n';
                if( (i+1) == len )
                {
                    if( chatlog.indexOf('<@') > 0 || args[0] == 'apps' )
                    {
                      const embedLookup = new Discord.RichEmbed()
                        .setColor('#' + color)
                        .setDescription(chatlog);
                        
                      if( args[0] == 'apps' ) embedLookup.setFooter('only showing the last 10 open applications');
                      
                      msg.channel.send(embedLookup);
                      return;
                    }
                    else
                    {
                      msg.channel.send('```ini\n'+chatlog+'\n```');
                      return;
                    }
                }
              }
            }
            
          });
          
        }
      }
      return;
      break;
    
    case 'settings':
      var members = client.guilds.get(config.server_id).members;
      member = members.find('id', msg.author.id);
      
            
      switch( args[0] )
      {
        case 'help':
          switch( args[1] )
          {
            case 'on':
              delayedmessage(msg, 'it\'s on now, you should see the help chats now');
              member.removeRole(config.roleid_hide_welcome);
              break;
            
            case 'off':
              delayedmessage(msg, 'it\'s off now, you won\'t see any more help chats');
              member.addRole(config.roleid_hide_welcome);
              break;
            
            default:
              delayedmessage(msg, 'sorry, i didn\'t understand. can you try again?');
              break;
          }
          return;
          break;
        
        case 'java':
          switch( args[1] )
          {
            case 'on':
              delayedmessage(msg, 'it\'s on now, you should see the java chats now');
              member.removeRole(config.roleid_hide_java);
              break;
            
            case 'off':
              delayedmessage(msg, 'it\'s off now, you won\'t see any more java chats');
              member.addRole(config.roleid_hide_java);
              break;
            
            default:
              delayedmessage(msg, 'sorry, i didn\'t understand. can you try again?');
              break;
          }
          return;
          break;
        
        case 'realm':
          switch( args[1] )
          {
            case 'on':
              delayedmessage(msg, 'it\'s on now, you should see the realm chats now');
              member.removeRole(config.roleid_hide_realm);
              break;
            
            case 'off':
              delayedmessage(msg, 'it\'s off now, you won\'t see any more realm chats');
              member.addRole(config.roleid_hide_realm);
              break;
            
            default:
              delayedmessage(msg, 'sorry, i didn\'t understand. can you try again?');
              break;
          }
          return;
          break;
        
        default:
          if( isempty(args[0]) )
          {
            var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
 
            const exampleEmbed = new Discord.RichEmbed()
              .setColor('#' + color)
              .setTitle('survivalcraft settings')
              .setDescription('customize your experience on our discord server')
              .addField('show/hide Realm chats', 'settings realm <off/on>', true)
              .addField('show/hide Java chats', 'settings java <off/on>', true)
              .addField('show/hide help chats like "how to join"', 'settings help <off/on>', true);
            
            delayedmessage(msg, exampleEmbed);
          }
          return;
          break;
      }

          
      break;
    
    case 'seen':
      var color = embedColors.colors[Math.floor(Math.random() * embedColors.colors.length)];
      
      taggedUser = args[0];
      
      if( taggedUser.substring(0, 2) == '<@' )
      {
        mentionchk = msg.mentions.members.first().id;
        mysqlquery = 'SELECT FROM_UNIXTIME(s.time, "%W %M %D at %l:%i %p") AS lastonline, u.user FROM co_session AS s INNER JOIN co_user AS u ON s.user = u.rowid INNER JOIN mc_links AS l ON LOWER(u.user) = LOWER(l.username) WHERE l.discid = "' + mentionchk + '" ORDER BY s.time DESC LIMIT 1';
      }
      else
      {
        mysqlquery = 'SELECT FROM_UNIXTIME(s.time, "%W %M %D at %l:%i %p") AS lastonline, u.user FROM co_session AS s INNER JOIN co_user AS u ON s.user = u.rowid  WHERE u.user LIKE "' + taggedUser + '%" ORDER BY s.time DESC LIMIT 1';
      }
      
      mysql.query(mysqlquery,
      function(e, result, fields)
      {
        if (e) throw e;
        
        result 		= result[0];
        
        if( isempty(result) )
        {
          delayedchat(msg, 'sorry, i couldn\'t find them', 1000);
          
        }
        else
        {
          const Discord = require('discord.js');
          
          const exampleEmbed = new Discord.RichEmbed()
            .setColor('#' + color)
            .setTitle(result.user)
            .setDescription('Last seen online ' + result.lastonline)
            .setFooter('for more commands just say help');
          
          msg.channel.send(exampleEmbed);
        }
        
      });
      return;
      break;
    
    case '!@':
      
      
      //client.channels.get('588938739368329246').send()
      
      //console.log(msg.guild.roles.get('569344337826152472').members.map(m=>m.user));
      
      
      
      /*
      var postVars = {url: 'http://approve.survivalcraft.club/test',
                      headers: { 'content-type': 'application/json' },
                      //url: 'https://authserver.mojang.com/authenticate',
                      formData: {'username': 'email@domain.com', 'password': 'PASSWORD', 'requestUser': 'true'}
                      };
      
      request.post(postVars, function (err, httpResponse, body)
      {
       console.log(body);
      });
      */
      
    /*
    
        client.channels.get("577297473119322112").fetchMessages()
          .then(messages => messages.array().forEach(
              message => message.author.equals(client.user) && message.delete()
          ));
      
      client.channels.get("577297473119322112").send('``joining the server``\nHello and welcome to Survival Craft ^.^ My name is Baylee and I\'m here to help. To apply for the whitelist, send me a message and say apply.\n\n``linking your accounts``\nIf you\'ve already been here a while you\'ll need to link your minecraft and discord accounts. To do that, send me a message and say link.');
      
        //msg.delete();

          exampleEmbed = new Discord.RichEmbed()
	.setColor('#ff7200')
  .setImage('https://i.imgur.com/Ln4FqV4.png');
msg.channel.send(exampleEmbed);


exampleEmbed = new Discord.RichEmbed()
	.setColor('#ff7200')
	.setDescription('- No excessive swearing\n - No flooding the chat\n - No advertising of any kind (including self promotion)\n - No bullying or harassment\n - No screaming or yelling in voice chat\n - No griefing/stealing\n - No mods that gives you an unfair advantage over other players\n - Listen and obey staff, don\'t argue\n - Be respectful to all other players')
msg.channel.send(exampleEmbed);







          exampleEmbed = new Discord.RichEmbed()
	.setColor('#f8ff39')
  .setImage('https://i.imgur.com/PcQh8R5.png');
msg.channel.send(exampleEmbed);

exampleEmbed = new Discord.RichEmbed()
	.setColor('#f8ff39')
    .addField('**[Java] SurvivalCraft**', '__' + config.ip_vanilla +'__')
    .addField('**[Java] Creative**', '__' + config.ip_creative +'__ <#' + config.chatid_donate + '>')
    .addField('**[Java] Events**', '__' + config.ip_event +'__')
    .addField('**[PE] Pocket**', '__' + config.pe +'__')
    .addField('**[XBox] Realm**', 'apply in <#' + config.realmchatid + '> with a mod')
  .setFooter('You will need to apply for whitelist before you can play');
msg.channel.send(exampleEmbed);

*/
    return;
    break;
  
    case 'update':
      if( msg.member.hasPermissions("VIEW_AUDIT_LOG") )
      {
        focus = '';
        
        switch( args[0] )
        {
          case 'java':
            focus = args[0] + '';
            role_id = config.roleid_java;
            chat_id = config.chatid_welcome_java;
            break;
          
          case 'realm':
            focus = args[0] + '';
            role_id = config.roleid_realm;
            chat_id = config.chatid_welcome_realm;
            break;
        }
    
        if(focus)
        {
          fs.readFile('defaults/join.'+focus+'.txt', 'utf8', function(err, contents) {
              var defaultsJoinJava = contents;
          
              role = msg.guild.roles.get(role_id)
              mods = msg.guild.roles.get(role_id).members.map(function(m) {
                return {
                  id: m.user.id,
                  nick: m.nickname,
                }
              });
              
              defaultsJoinJava = defaultsJoinJava + `\n:white_small_square: ${role}`;
              
              for (var i = 0, len = mods.length; i < len; i++) {
                nickname = mods[i].nick;
                if( nickname.search('[Java]') == 1 || nickname.search('[Realm]') == 1 )
                {
                  defaultsJoinJava = defaultsJoinJava + '\n:white_small_square: <@' + mods[i].id + '>';
                }
                if( (i+1) == len )
                {
                  client.channels.get(chat_id).send(defaultsJoinJava)
                }
              }
          });
        }
      }
      return;
      break;
    
    case 'post':
      if( msg.channel.id == config.chatid_baylee_research )
      {
        switch( args[0] )
        {
          case 'channel':
            if( msg.member.hasPermissions("VIEW_AUDIT_LOG") )
            {
              set_conversation(msg, 'channel');
              delayedchat(msg, 'i\'m ready to be your proxy. tag the channel you want to post in.', 3000);
            }
            break;
          
          case 'news':
            if( msg.member.hasPermissions("VIEW_AUDIT_LOG") )
            {
              set_conversation(msg, 'news');
              delayedchat(msg, 'let\'s post some news. what\'s the headline for this news post?', 3000);
            }
            break;
          
          case 'poll':
            if( msg.member.hasPermissions("VIEW_AUDIT_LOG") )
            {
              set_conversation(msg, 'poll');
              delayedchat(msg, 'time to poll the server. what\'s the headline for this poll?', 3000);
            }
            break;
          
          case 'event':
            if( msg.member.hasPermissions("VIEW_AUDIT_LOG") )
            {
              set_conversation(msg, 'event');
              delayedchat(msg, 'i\'m here to post an event', 2000, true);
              delayedchat(msg, 'make sure the headline has the date and name of event', 4000, true);
              delayedchat(msg, 'for example **may 17th - happy birthday, minecraft**', 7000, true);
              delayedchat(msg, 'what would you like the headline to be?', 10000);
            }
            break;
        }
      }
      return;
      break;
    
    case '!app':
    var response;
    
    if( msg.webhookID == '576171898707247146' )
    {
      mysql.query('SELECT * FROM applications WHERE appid = "' + args[0] + '" AND status = "submitted" LIMIT 1',
      function(e, result, fields)
      {
        result = result[0];
        
        if( isempty(result) ) {
          //telljavastaff('I can\'t find that application. They may have already been rejected.');
          console.log ('cant find ' + args[0]);
          return;
        }
        else
        {
          newapp = new Discord.RichEmbed()
                  .setTitle('New Application')
                  .setThumbnail(result.image)
                  .addField('What\'s your minecraft username?', result.ign)
                  .addField('How old are you?', result.age)
                  .addField('Which server?', result.platform)
                  .addField('Why do you want to play on here?', result.why)
                  .addField('Do agree to not grief?', result.antigrief)
                  .addField('Have you read the rules?', result.rules)
                  .addBlankField();
                      
          if( result.platform == 'java' )
          {
              newapp.setColor('#0099ff')
              .addField('Actions:', '[:white_check_mark: Approve](http://approve.survivalcraft.club/' + result.appid + ') [:no_entry_sign: Reject](http://reject.survivalcraft.club/' + msg.author.id + ')')
              .setFooter('If you reject a player, please message them and tell them why.');
          }
          else
          {
              newapp.setColor('#FF5400')
              .addField('Actions:', '[:white_check_mark: Sent invite](http://approve.survivalcraft.club/' + result.appid + ') [:no_entry_sign: Reject](http://reject.survivalcraft.club/' + msg.author.id + ')')
              .setFooter('Add player as a friend and then send an invite to them to join the realm. If you reject a player, please message them and tell them why.');
          }
          
          client.channels.get(config.chatid_baylee_research).send(newapp);
        }
      });
      
      msg.delete();
    }
    return;
    break;
    
    case '!reject':
    var response;
    
    if( msg.webhookID == '576171898707247146' )
    {
      mysql.query('SELECT * FROM applications WHERE appid = "' + args[0] + '" AND status = "submitted" LIMIT 1',
      function(e, result, fields)
      {
      result = result[0];
      
      if( isempty(result) ) {
        //telljavastaff('I can\'t find that application. They may have already been rejected.');
        console.log ('cant find ' + args[0]);
        return;
      }
      mysql_query('UPDATE applications SET status = "rejected" WHERE appid = "' + args[0] + '" LIMIT 1');
      
      
      appresp = new Discord.RichEmbed()
        .setColor('#ff0099')
        .setDescription('i told <@' + args[0] + '> (**' + result.ign + '**) that we declined their application.')
        .addField('**important**', 'you must message them and tell them why they were declined');
        
        switch( result.platform )
        {
          case 'realm':
          case 'pocket':
          case 'xbox':
            try {
              client.channels.get(config.chatid_app_realm).send(appresp);
            }catch(e){console.log('[ERROR]', e);}
            break;
          
          case 'java':
              client.channels.get(config.chatid_app_java).send(appresp);
            break;
          
          default:
            telljavastaff('there was an error reading the application for ' + result.ign + '. you should probably tell centers.');
            break;
        }
      
        client.users.get(result.appid).send('sorry, but your application wasn\'t approved. a mod will contact you in a few minutes to talk about it.');
      });
      
      msg.delete();
    }
    return;
    break;
    
    case '!approve':
    var response;
    
    if( msg.webhookID == '576171898707247146' )
    {
      mysql.query('SELECT * FROM applications WHERE appid = "' + args[0] + '" AND status = "submitted" LIMIT 1',
      function(e, result, fields)
      {
        if (e) throw e;
        
        result = result[0];
        
        
        if( isempty(result) ) {
        //telljavastaff('I can\'t find that application. Someone may have already whitelisted them or you may have to manually approve them.');
        return;
        }
        
        appresp = new Discord.RichEmbed()
        .setColor('#00ff99')
        .setDescription('I told <@' + args[0] + '> (**' + result.ign + '**) that we accepted their application.');
        
        switch( result.platform )
        {
          case 'realm':
          case 'pocket':
          case 'xbox':
            try {
              client.channels.get(config.chatid_app_realm).send(appresp);
              client.users.get(result.appid).send('good news, you were approved! i sent an invite to your xbox live account. if you don\'t see it, contact a realm mod');
            }catch(e){console.log('[ERROR]', e);}
            
            mysql_query('UPDATE applications SET status = "complete" WHERE appid = "' + result.appid + '" LIMIT 1');
            break;
          
          case 'java':
            rconn('java', 'whitelist add ' + result.ign);
            rconn('vfs', 'whitelist add ' + result.ign);
            try {
              client.channels.get(config.chatid_app_java).send(appresp);
              client.users.get(result.appid).send('good news, you got approved! if you need the ip address for the server, just say ip');
            }catch(e){console.log('[ERROR]', e);}
            
            mysql_query('UPDATE applications SET status = "complete" WHERE appid = "' + result.appid + '" LIMIT 1');
            break;
          
          default:
            telljavastaff('there was an error reading the application for ' + result.ign + '. you should probably tell centers.');
            break;
        }
      });
      
      msg.delete();
    return;
    break;
    }
  }
  
      //send to baylee messages if i can't process the DM
     if( !msg.guild ) client.channels.get(config.chatid_baylee_messages).send('<@' + msg.author.id + '> ' + msg.content);
      
  
  //end phrases
}

client.login(config.token);