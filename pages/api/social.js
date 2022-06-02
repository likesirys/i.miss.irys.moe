const {parseString} = require('xml2js')
import { extractCommunityPosts } from "yt-scraping-utilities"

const fetchTweets = async function (endpoint, url) {
    try {
        let tweets = await fetch(url)
        let _tweets = []
        let endpointRegExp
        eval(`endpointRegExp = new RegExp(/href="https?:\\/\\/${endpoint}\\//g)`)
        await parseString(await tweets.text(), {trim: true}, async function(err, res) {
            if (err) { return []; }
            if (!res || !res.rss || !res.rss.channel || ! res.rss.channel instanceof Array || res.rss.channel.length < 1) { return []; }
            let items = res.rss.channel[0].item
            if (!items || items.length < 1) { return []; }
            await items.forEach((item,i) => {
                item.description = item.description.map(d => {
                    return d.replace(/piped.kavin.rocks\//g, 'www.youtube.com/watch?v=').replace(/youtu.be\//g, 'www.youtube.com/watch?v=').replace(endpointRegExp, 'href="https://twitter.com/').replace(/nitter.*\/(?<status>\w+)\/status/g, function(match, p1, p2, p3, offset, string) {return `twitter.com/${p1}/status`}).replace(/http:\/\//g, 'https://').replace(/#m\<\/a\>/g, '</a>')
                })
                const isRetweet = (item.title[0].startsWith('RT by @irys_en:'))
                item.retweet = !!isRetweet
                _tweets.push({type: 'twitter', date: new Date(item.pubDate), data: item})
            })
            let nth_retweet = _tweets.length
            for (let i = 0; i < _tweets.length; i++) {
                if (_tweets[i].data.retweet) {
                    for (let j = i; j < _tweets.length; j++) {
                        if (!_tweets[j].data.retweet) {
                            _tweets[i].date = _tweets[j].date
                            _tweets[i].date = new Date(Date.parse(_tweets[i].date)+(3600*(nth_retweet)))
                            nth_retweet-=1
                            break
                        }
                    }
                }
            }
        })
        return _tweets
    } catch (err) {
        console.error(err)
        return []
    }
}

export async function getSocials() {
    let socials = []
    try {
        let leddit = await fetch('https://old.reddit.com/user/IRySoWise.rss')
        await parseString(await leddit.text(), {trim: true}, function(err,res) {
            if (err) { return; }
            if (!res || !res.feed) { return; }
            let items = res.feed.entry
            if (!items || items.length < 1) { return; }
            items.forEach(item => {
                socials.push({type: 'reddit', date: new Date(item.updated), data: item})
            })
        })
    } catch (err) { console.error(err); }

    const nitterEndpoints = ['https://nitter.irys.moe', 'https://nitter.net']

    for (let endpoint of nitterEndpoints) {
        let tweets
        try {
            tweets = await fetchTweets(endpoint.replace(/https?:\/\//, ''), `${endpoint}/irys_en/with_replies/rss`)
        } catch (err) { console.error(err); }
        if (tweets.length === 0 || !tweets) { continue; }
        tweets.forEach(tweet => { socials.push(tweet); })
        break   
    }

    try {
        let youtubeCommunityPostReq = await fetch(`https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}/community`)
        let youtubeCommunityPosts = extractCommunityPosts(await youtubeCommunityPostReq.text())
        youtubeCommunityPosts.forEach(post => {
            let social = {type: 'youtube', date: new Date(post.approximatePostDate)}
            post.approximatePostDate = post.approximatePostDate.toString()
            social.data = post
            social.data.href = `https://www.youtube.com/post/${post.id}`
            post.content = post.content.filter(e => { return (!e) ? false : true })
            socials.push(social)
        })
    } catch (err) { console.error(err); }

    try {
        let youtubeVODsReq = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id\=${process.env.WATCH_CHANNEL_ID}`)
        parseString(await youtubeVODsReq.text(), function(err, res) {
            if (err) { return; }
            if (! res instanceof Object || !res.feed || !res.feed.entry || ! res.feed.entry instanceof Array || res.feed.entry.length <=0 ) { return; }
            res.feed.entry.forEach(vod => {
                socials.push({type: 'youtube', date: new Date(vod.published[0]), data: {
                    attachmentType: 'VIDEO',
                    video: {id: vod['yt:videoId'][0]},
                    href: `https://www.youtube.com/watch?v=${vod['yt:videoId'][0]}`,
                    content: [{text: vod.title}]
                }})
            })
        })
    } catch (err) { console.error(err); }

    return socials.sort((a,b) => { return Date.parse(a.date) < Date.parse(b.date) || -1 });
}

export default async function(req, res) {
    let socials = await getSocials()
    return res.status(200).json(JSON.stringify(socials))
}
