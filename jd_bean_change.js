/*
/*
 * 简化版京东日资产变动通知
 * 支持环境变量控制每次发送的账号个数，默认为2
 * 环境变量为：JD_BEAN_CHANGE_SENDNUM
 
[task_local]
#京东日资产变动通知
20 9 * * * jd_bean_change.js, tag=京东日资产变动通知, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/jd.png, enabled=true
 * */
const $ = new Env("京东日资产变动");
const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
const notify = $.isNode() ? require('./sendNotify') : '';
let cookiesArr = [], cookie = "", message = ``;
const JD_API_HOST = 'https://api.m.jd.com/client.action';
$.todayIncome = 0
$.todayExpenditure = 0
$.yestodayIncome = 0
$.yestodayExpenditure = 0
$.beanCount = 0;
$.beanFlag = true;
$.jdName = ``
$.sendNum = process.env.JD_BEAN_CHANGE_SENDNUM * 1 || 10
$.sentNum = 0;
if($.isNode()){
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item]);
    });
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === "false") console.log = () => {
    };
} else cookiesArr = [$.getdata("CookieJD"), $.getdata("CookieJD2"), ...$.toObj($.getdata("CookiesJD") || "[]").map((item) => item.cookie),].filter((item) => !!item);

!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, "【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取", "https://bean.m.jd.com/", {"open-url": "https://bean.m.jd.com/"});
        return;
    }

    for(let i = 0; i < cookiesArr.length; i++){
        cookie = cookiesArr[i];
        $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
        $.index = i + 1;
        $.jdSpeedGoldBalance = 0;
        $.jdzzNum = 0;
        console.log(`[京东账号${$.index} ${$.UserName}]`)
        await bean();
        //await totalBean();
        message += `${$.index}：${$.jdName}\n`
        console.log(`${$.index}：${$.jdName}`)
        message += `今日收支：${$.todayIncome}京豆 | ${$.todayExpenditure}京豆\n`
        console.log(`今日收支：${$.todayIncome}京豆 | ${$.todayExpenditure}京豆`)
        message += `昨日收支：${$.yestodayIncome}京豆 | ${$.yestodayExpenditure}京豆\n`
        console.log(`昨日收支：${$.yestodayIncome}京豆 | ${$.yestodayExpenditure}京豆`)
        message += `当前京豆：${$.beanCount}京豆\n`
        console.log(`当前京豆：${$.beanCount}京豆`)
        //speed jd
        await getJdzz();
        typeof $.jdzzNum !== "undefined" ? message += `京东赚赚：${$.jdzzNum}金币 ≈ ${($.jdzzNum / 10000).toFixed(2)}元\n` : ''
        typeof $.jdzzNum !== "undefined" ? console.log(`京东赚赚：${$.jdzzNum}金币 ≈ ${($.jdzzNum / 10000).toFixed(2)}元`) : ''
        $.JdMsScore = 0;
        await getMs();
        $.JdMsScore !== 0 ? message += `京东秒杀：${$.JdMsScore}秒币 ≈ ${($.JdMsScore / 1000).toFixed(2)}元\n` : ''
        $.JdMsScore !== 0 ? console.log(`京东秒杀：${$.JdMsScore}秒币 ≈ ${($.JdMsScore / 1000).toFixed(2)}元`) : ''
        await redPacket();

        message += `\n`
        console.log(`[京东账号${$.index} ${$.UserName}] 结束\n`)
        if ($.isNode()) {
            if ($.index % $.sendNum === 0) {
                $.sentNum++;
                console.log(`正在进行第 ${$.sentNum} 次发送通知，发送数量：${$.sendNum}`)
                await notify.sendNotify(`${$.name}`, `${message}`)
                message = "";
            }
        }

    }
    //删除多余的通知
    if($.isNode()){
        let cnum = cookiesArr.length - ($.sentNum * $.sendNum)
        if(cnum < $.sendNum && cnum !=0 ){
            console.log(`正在进行最后一次发送通知，发送数量：${(cookiesArr.length - ($.sentNum * $.sendNum))}`)
            await notify.sendNotify(`${$.name}`, `${message}`)
            message = "";
        }
    }
})().catch((e) => {
    $.log("", `❌ ${$.name}, 失败! 原因: ${e}!`, "");
}).finally(() => {
    $.done();
});

async function bean(){
    $.beanPage = 1;
    $.todayIncome = 0
    $.todayExpenditure = 0
    $.yestodayIncome = 0
    $.yestodayExpenditure = 0
    $.beanFlag = true;
    $.beanCount = 0;
    do {
        getJingBeanBalanceDetail($.beanPage);
        await $.wait(1000)
    } while($.beanFlag === true)
}

//获取京豆数据
function getJingBeanBalanceDetail(page){
    const yesterdayTimeStamp = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000 - (24 * 60 * 60 * 1000);
    const todayTimeStamp = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000;
    return new Promise((resolve) => {
        const options = {
            url: 'https://api.m.jd.com/client.action?functionId=getJingBeanBalanceDetail',
            body: `body=%7B%22pageSize%22%3A%2220%22%2C%22page%22%3A%22${page}%22%7D&appid=ld`,
            headers: {
                "Cookie": cookie,
                Connection: "keep-alive",
                "User-Agent": "jdapp;iPhone;10.1.2;15.0;network/wifi;Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
            },
        }
        $.post(options, (err, resp, data) => {
            try{
                if(err){
                    $.beanFlag = false;
                    if(JSON.stringify(err) !== `\"read ECONNRESET\"`){
                        console.log(JSON.stringify(err))
                        console.log(`${$.name} API请求失败，请检查网路重试`)
                    }
                } else {
                    if(data){
                        data = JSON.parse(data);
                        if(data.code === "0"){
                            $.beanPage++;
                            let detailList = data.detailList;
                            if(detailList && detailList.length > 0){
                                for(let item of detailList){
                                    const date = item.date.replace(/-/g, '/') + "+08:00";
                                    if(new Date(date).getTime() >= todayTimeStamp && (!item['eventMassage'].includes("退还") && !item['eventMassage'].includes('扣赠'))){
                                        Number(item.amount) > 0 ? $.todayIncome += Number(item.amount) : $.todayExpenditure += Number(item.amount);
                                    } else if(yesterdayTimeStamp <= new Date(date).getTime() && new Date(date).getTime() < todayTimeStamp && (!item['eventMassage'].includes("退还") && !item['eventMassage'].includes('扣赠'))){
                                        Number(item.amount) > 0 ? $.yestodayIncome += Number(item.amount) : $.yestodayExpenditure += Number(item.amount)
                                    } else if(yesterdayTimeStamp > new Date(date).getTime()){
                                        $.beanFlag = false;
                                        break;
                                    }
                                }
                            } else $.beanFlag = false;
                        } else if(data && data.code === "3"){
                            console.log(`cookie已过期，或者填写不规范`)
                            $.beanFlag = false;
                        } else {
                            console.log(`未知情况：${JSON.stringify(data)}`);
                            console.log(`未知情况，跳出`)
                            $.beanFlag = false;
                        }
                    } else {
                        $.beanFlag = false;
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch(e){
                $.logErr(e, resp)
                $.beanFlag = false;
            } finally{
                resolve(data);
            }
        });
    });
}

function totalBean(){
    $.jdName = ``
    return new Promise(async resolve => {
        const options = {
            url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
            headers: {
                Cookie: cookie,
                "User-Agent": "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
            }
            // "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
        }
        $.get(options, (err, resp, data) => {
            try{
                if(err){
                    $.logErr(err)
                } else {
                    if(data){
                        data = JSON.parse(data);
                        if(data.retcode === "1001"){
                            $.isLogin = false; //cookie过期
                            return;
                        }
                        if(data.retcode === "0" && data.data && data.data.hasOwnProperty("userInfo")){
                            $.jdName = `${data.data.userInfo.baseInfo.nickname} ${data.data.userInfo.baseInfo.levelName}`
                        }
                        if(data.retcode === '0' && data.data && data.data.assetInfo){
                            $.beanCount = data.data && data.data.assetInfo.beanNum;
                        }
                    } else {
                        $.log('京东服务器返回空数据');
                    }
                }
            } catch(e){
                $.logErr(e)
            } finally{
                resolve();
            }
        })
    })
}

function getJdzz(){
    return new Promise(resolve => {
        $.get(taskJDZZUrl("interactTaskIndex"), async(err, resp, data) => {
            try{
                if(err){
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if(safeGet(data)){
                        data = JSON.parse(data);
                        $.jdzzNum = data.data.totalNum
                    }
                }
            } catch(e){
                $.logErr(e, resp)
            } finally{
                resolve(data);
            }
        })
    })
}

function taskJDZZUrl(functionId, body = {}){
    return {
        url: `${JD_API_HOST}?functionId=${functionId}&body=${escape(JSON.stringify(body))}&client=wh5&clientVersion=9.1.0`,
        headers: {
            'Cookie': cookie,
            'Host': 'api.m.jd.com',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
            'Referer': 'http://wq.jd.com/wxapp/pages/hd-interaction/index/index',
            'User-Agent': "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
            'Accept-Language': 'zh-cn',
            'Accept-Encoding': 'gzip, deflate, br',
        }
    }
}

function getMs(){
    return new Promise(resolve => {
        $.post(taskMsPostUrl('homePageV2', {}, 'appid=SecKill2020'), (err, resp, data) => {
            try{
                if(err){
                    console.log(`${err},${jsonParse(resp.body)['message']}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if(safeGet(data)){
                        data = JSON.parse(data)
                        if(data.code === 2041){
                            $.JdMsScore = data.result.assignment.assignmentPoints || 0
                        }
                    }
                }
            } catch(e){
                $.logErr(e, resp)
            } finally{
                resolve(data);
            }
        })
    })
}

function taskMsPostUrl(function_id, body = {}, extra = '', function_id2){
    let url = `${JD_API_HOST}`;
    function_id2 ? url += `?functionId=${function_id2}` : ''
    return {
        url,
        body: `functionId=${function_id}&body=${escape(JSON.stringify(body))}&client=wh5&clientVersion=1.0.0&${extra}`,
        headers: {
            "Cookie": cookie,
            "origin": "https://h5.m.jd.com",
            "referer": "https://h5.m.jd.com/babelDiy/Zeus/2NUvze9e1uWf4amBhe1AV6ynmSuH/index.html",
            'Content-Type': 'application/x-www-form-urlencoded',
            "User-Agent": 'jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
        }
    }
}

function redPacket(){
    return new Promise(async resolve => {
        const options = {
            "url": `https://m.jingxi.com/user/info/QueryUserRedEnvelopesV2?type=1&orgFlag=JD_PinGou_New&page=1&cashRedType=1&redBalanceFlag=1&channel=1&_=${+new Date()}&sceneval=2&g_login_type=1&g_ty=ls`,
            "headers": {
                'Host': 'm.jingxi.com',
                'Accept': '*/*',
                'Connection': 'keep-alive',
                'Accept-Language': 'zh-cn',
                'Referer': 'https://st.jingxi.com/my/redpacket.shtml?newPg=App&jxsid=16156262265849285961',
                'Accept-Encoding': 'gzip, deflate, br',
                "Cookie": cookie,
                'User-Agent': "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"
            }
        }
        $.get(options, (err, resp, data) => {
            try{
                if(err){
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if(data){
                        data = JSON.parse(data).data
                        $.jxRed = 0, $.jsRed = 0, $.jdRed = 0, $.jdhRed = 0, $.jxRedExpire = 0, $.jsRedExpire = 0, $.jdRedExpire = 0, $.jdhRedExpire = 0;
                        let t = new Date()
                        t.setDate(t.getDate() + 1)
                        t.setHours(0, 0, 0, 0)
                        t = parseInt((t - 1) / 1000)
                        for(let vo of data.useRedInfo.redList || []){
                            if(vo.orgLimitStr && vo.orgLimitStr.includes("京喜")){
                                $.jxRed += parseFloat(vo.balance)
                                if(vo['endTime'] === t){
                                    $.jxRedExpire += parseFloat(vo.balance)
                                }
                            } else if(vo.activityName.includes("极速版")){
                                $.jsRed += parseFloat(vo.balance)
                                if(vo['endTime'] === t){
                                    $.jsRedExpire += parseFloat(vo.balance)
                                }
                            } else if(vo.orgLimitStr && vo.orgLimitStr.includes("京东健康")){
                                $.jdhRed += parseFloat(vo.balance)
                                if(vo['endTime'] === t){
                                    $.jdhRedExpire += parseFloat(vo.balance)
                                }
                            } else {
                                $.jdRed += parseFloat(vo.balance)
                                if(vo['endTime'] === t){
                                    $.jdRedExpire += parseFloat(vo.balance)
                                }
                            }
                        }
                        $.jxRed = $.jxRed.toFixed(2)
                        $.jsRed = $.jsRed.toFixed(2)
                        $.jdRed = $.jdRed.toFixed(2)
                        $.jdhRed = $.jdhRed.toFixed(2)
                        $.balance = data.balance
                        $.expiredBalance = ($.jxRedExpire + $.jsRedExpire + $.jdRedExpire).toFixed(2)
                        message += `🧧京喜红包：${$.jxRed}元 今天总过期 ${$.jxRedExpire.toFixed(2)} 元\n`
                        console.log(`🧧京喜红包：${$.jxRed}元 今天总过期 ${$.jxRedExpire.toFixed(2)} 元`)
                        message += `🧧极速红包：${$.jsRed}元 今天总过期 ${$.jsRedExpire.toFixed(2)} 元\n`
                        console.log(`🧧极速红包：${$.jsRed}元 今天总过期 ${$.jsRedExpire.toFixed(2)} 元`)
                        message += `🧧京东红包：${$.jdRed}元 今天总过期 ${$.jdRedExpire.toFixed(2)} 元\n`
                        console.log(`🧧京东红包：${$.jdRed}元 今天总过期 ${$.jdRedExpire.toFixed(2)} 元`)
                        message += `🧧健康红包：${$.jdhRed}元 今天总过期 ${$.jdhRedExpire.toFixed(2)} 元\n`
                        console.log(`🧧健康红包：${$.jdhRed}元 今天总过期 ${$.jdhRedExpire.toFixed(2)} 元`)
                        message += `🧧当前红包：${$.balance}元 今天总过期 ${$.expiredBalance} 元\n`
                        console.log(`🧧当前红包：${$.balance}元 今天总过期 ${$.expiredBalance} 元`)
                    } else {
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch(e){
                $.logErr(e, resp)
            } finally{
                resolve(data);
            }
        })
    })
}

function safeGet(data){
    try{
        if(typeof JSON.parse(data) == "object"){
            return true;
        }
    } catch(e){
        console.log(e);
        console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}