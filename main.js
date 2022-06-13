//TODO:
//クリップサイズ変更
//トラック拡大縮小
//再生ヘッド表示
//複数トラック対応
//undo,redoはトラックごとスタックするだけで出来る
//tarckはtargetTrackにしなければ

//default clip config
const clipConfig = {
    height: 30,
    startlineWidth: 3,
    endlineWidth: 3,
    // overlap: false,//クリップの重なりを許容するか
    autoRipple: false,//未
}

const clip1 = {
    start:{
        time:0,
        color:"green"
    },
    middle:{
        color:"blue"
    },
    end:{
        color:"red"
    },
    duration: 100,
    target: false,
}

const clip2 = {
    start:{
        time:120,
        color:"green"
    },
    middle:{
        color:"blue"
    },
    end:{
        color:"red"
    },
    duration: 60,
    target: false,
}

const clip3 = {
    start:{
        time:200,
        color:"green"
    },
    middle:{
        color:"aqua"
    },
    end:{
        color:"red"
    },
    duration: 60,
    target: false,
}

const track = {
    trackNo: 0,
    clips: [
        clip1,
        clip2,
        clip3,
    ]
}

const canvas = document.getElementById("timeline_canvas");
const ctx = canvas.getContext("2d");


let targetTrack = null;
let targetClip = null;
let startlineResize = false;//スタートラインにマウスがいる
let endlineResize = false;


canvas.addEventListener("mousedown", (e) => {
    // マウスの座標をCanvas内の座標とあわせるため
    const rect = canvas.getBoundingClientRect();
    const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
  
    // クリック判定処理
    //まずはどのトラック上にいるか
    const trackNo = Math.floor(point.y / clipConfig.height);

    
    if(track.trackNo == trackNo){
        targetTrack = track;
    }

    if(targetTrack == null){
        return;
    }

    
    for(let i=0; i<targetTrack.clips.length; i++){
        const clip = targetTrack.clips[i];
        const x = clip.start.time;
        const w = clip.duration;

        if(x <= point.x && point.x <= x + clipConfig.startlineWidth){
            targetClip = clip;
            targetClip.target = true;//今は使われていないが、色わけなどに
            startlineResize = true;
            // document.documentElement.style.cursor = "e-resize";

            break;
        }
        else if(x+w-clipConfig.endlineWidth <= point.x && point.x <= x+w){
            targetClip = clip;
            targetClip.target = true;//今は使われていないが、色わけなどに
            endlineResize = true;
            // document.documentElement.style.cursor = "e-resize";

            break;
        }
        else if(x <= point.x && point.x <= x + w){
            targetClip = clip;
            targetClip.target = true;//今は使われていないが、色わけなどに

            break;
        }
        else{
            continue;
        }
    }
});


window.addEventListener("mousemove",(e)=>{
    // マウスの座標をCanvas内の座標とあわせるため
    const rect = canvas.getBoundingClientRect();
    const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };

    //カーソル変更
    if(targetClip == null){
        for(let i=0; i<track.clips.length; i++){
            const clip = track.clips[i];
            const x = clip.start.time;
            const w = clip.duration;
    
            if(x <= point.x && point.x <= x + clipConfig.startlineWidth){
                document.documentElement.style.cursor = "e-resize";
                break;
            }
            else if(x+w-clipConfig.endlineWidth <= point.x && point.x <= x+w){
                document.documentElement.style.cursor = "e-resize";
                break;
            }
            else if(x <= point.x && point.x <= x + w){
                document.documentElement.style.cursor = "grab";
                break;
            }
            else{
                document.documentElement.style.cursor = "auto";
                continue;
            }
        }

        return;
    }

    
    //マウスに付いて移動
    targetClip.start.time = point.x;

    // console.log(isCollisionX(track.clips[1],track.clips[2]));

    refreshTimeline();
});


window.addEventListener("mouseup",(e)=>{
    if(targetClip == null){
        return;
    }

    clipSort(track);
    let targetClipIndex;
    for(let i=0; i<track.clips.length; i++){
        if(track.clips[i] == targetClip){
            targetClipIndex = i;
            break;
        }
    }

    let beforeClip = track.clips[targetClipIndex -1];
    let afterClip = track.clips[targetClipIndex +1];

    //targetClipの一つ前と衝突していれば
    if(isCollisionX(targetClip, beforeClip)){
        //clipの後ろ半分に先頭があれば
        if((beforeClip.start.time + beforeClip.duration/2) <= targetClip.start.time){
            //beforeClipの後ろに移動
            targetClip.start.time = beforeClip.start.time + beforeClip.duration;
            if(isCollisionX(targetClip, afterClip)){
                slideAfterClips(track, targetClipIndex);
            }
        }
        
        //前半分
        else{
            //beforeClipの前に移動
            targetClip.start.time = beforeClip.start.time - targetClip.duration;

            clipSort(track);

            for(let i=0; i<track.clips.length; i++){
                if(track.clips[i] == targetClip){
                    targetClipIndex = i;
                    break;
                }
            }

            beforeClip = track.clips[targetClipIndex -1];
            afterClip = track.clips[targetClipIndex +1];

            if(isCollisionX(targetClip, beforeClip)){
                console.log("移動")
                slideAfterClips(track, targetClipIndex-1);
            }
        }
    }


    else if(isCollisionX(targetClip, afterClip)){
        //afterClipの前に移動
        targetClip.start.time = afterClip.start.time - targetClip.duration;

        clipSort(track);

        for(let i=0; i<track.clips.length; i++){
            if(track.clips[i] == targetClip){
                targetClipIndex = i;
                break;
            }
        }

        beforeClip = track.clips[targetClipIndex -1];
        afterClip = track.clips[targetClipIndex +1];

        if(isCollisionX(targetClip, beforeClip)){
            slideAfterClips(track, targetClipIndex-1);
        }
    }


    //最初のクリップのstartがマイナスにいれば
    if(track.clips[0].start.time < 0){
        const slide_duration = 0 - track.clips[0].start.time;
        track.clips.forEach(clip =>{
            clip.start.time += slide_duration;
        });
    }

    
    

    refreshTimeline();

    targetClip.target = false;
    targetTrack = null;
    targetClip = null;
    startlineResize = false;
    endlineResize = false;
});


//clipを小さい順に並べ替える

function clipSort(track){
    track.clips.sort((a,b)=>{return (a.start.time < b.start.time ? -1 : 1);});
}

//targetIndexより後ろのclipを全てずらす
function slideAfterClips(track, targetClipIndex){
    const targetClip = track.clips[targetClipIndex];
    //動かす大きさ
    const slide_duration = targetClip.start.time+targetClip.duration - track.clips[targetClipIndex+1].start.time;

    for(let i=targetClipIndex+1; i<track.clips.length-targetClipIndex+1; i++){
        if(track.clips[i]==undefined){
            return;
        }
        track.clips[i].start.time += slide_duration;
    }
}


//クリップを描画
function drawClip(clip, trackNo=0){
    const x = clip.start.time;//*定数
    const y = trackNo * clipConfig.height;
    const w = clip.duration;
    const h = clipConfig.height;

    ctx.fillStyle = clip.middle.color;
    ctx.fillRect(x,y,w,h);

    ctx.fillStyle = clip.start.color;
    ctx.fillRect(x,y, clipConfig.startlineWidth, h);

    ctx.fillStyle = clip.end.color;
    ctx.fillRect(x + w - clipConfig.endlineWidth,  y,  clipConfig.endlineWidth, h);
}

//画面を更新
function refreshTimeline(){
    ctx.clearRect(0,0, canvas.clientWidth, canvas.height);
    
    
    for(let j=0; j<track.clips.length; j++){
        drawClip(track.clips[j], track.trackNo);
    }

    if(targetClip != null){
        //targetClipをもう一度描画して、前面に表示
        drawClip(targetClip);
    }
}

//X軸方向の衝突判定
function isCollisionX(clip1, clip2){
    if(clip1 == undefined || clip2 == undefined){
        return false;
    }

    if(
        (clip1.start.time <= clip2.start.time && clip1.start.time+clip1.duration >= clip2.start.time) ||
        (clip2.start.time <= clip1.start.time && clip2.start.time+clip2.duration >= clip1.start.time)
    ){
        return true;
    }
    else{
        return false;
    }
}

refreshTimeline();
