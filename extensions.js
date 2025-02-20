/*********************************************************************
 * extensions.js - Shows LAB color-coded + row 6 features:
 *   - Sobel edge detection
 *   - Morphological ops
 *   - Otsu threshold
 *********************************************************************/

let videoExt;
let isRealtimeExt = true; // or false, if you want a snapshot approach
let canvasWExt = 900;
let canvasHExt = 300;

let morphIterSlider;
let btnBack;

function setup() {
  let cnv = createCanvas(canvasWExt, canvasHExt);
  cnv.parent("canvasContainer");

  videoExt = createCapture(VIDEO);
  videoExt.size(640, 480);
  videoExt.hide();

  btnBack = select("#btnBack");
  btnBack.mousePressed(()=>{
    window.location.href = "index.html";
  });

  morphIterSlider = select("#morphIter");
}

function draw() {
  background(220);

  let source = videoExt.get();
  source.resize(160,120);

  // We'll arrange them in a single row, spaced out
  let xBase = 20, yBase = 20;
  let gapX = 180;

  // 1) Base image
  image(source, xBase, yBase);
  drawLabel("Base image", xBase, yBase+120+4);

  // 2) LAB color-coded
  let labImg = convertImage(source,"LAB");
  image(labImg, xBase+gapX, yBase);
  drawLabel("LAB color-coded", xBase+gapX, yBase+120+4);

  // 3) Sobel edges on grayscale+bright
  let grayBright = makeGrayBright(source,1.2);
  let sobelImg = sobelEdge(grayBright);
  image(sobelImg, xBase+2*gapX, yBase);
  drawLabel("Sobel edges", xBase+2*gapX, yBase+120+4);

  // 4) Morph ops on thresholded Red
  let redImg = extractChannel(source,"red");
  let thrRed = thresholdChannel(redImg,128);
  let iters = parseInt(morphIterSlider.value());
  let morphImg = doMorphN(thrRed,iters);
  image(morphImg, xBase+3*gapX, yBase);
  drawLabel(`Morph x${iters}`, xBase+3*gapX, yBase+120+4);

  // 5) Otsu on grayscale+bright
  let otsuVal = computeOtsuThreshold(grayBright);
  let otsuImg = thresholdImage(grayBright,otsuVal);
  image(otsuImg, xBase+4*gapX, yBase);
  drawLabel("Otsu Color Space", xBase+4*gapX, yBase+120+4);

  fill(0);
  noStroke();
  textSize(14);
  text("Extensions page. Press 'Back to Main' to return.", 20, height-10);
}

// Simple label
function drawLabel(txt,x,y){
  push();
  textSize(14);
  let pad=4;
  fill(0);
  let w=textWidth(txt)+pad*2;
  let h=18;
  rect(x,y,w,h);
  fill(255);
  text(txt,x+pad,y+h-4);
  pop();
}

// Reuse the same helper functions from your main page

function makeGrayBright(img, scale) {
  let out=createImage(img.width,img.height);
  img.loadPixels();
  out.loadPixels();
  for(let i=0;i<img.pixels.length;i+=4){
    let r=img.pixels[i], g=img.pixels[i+1], b=img.pixels[i+2];
    let a=img.pixels[i+3];
    let gray=(r+g+b)/3;
    let bright=constrain(gray*scale,0,255);
    out.pixels[i]=bright; out.pixels[i+1]=bright; out.pixels[i+2]=bright; out.pixels[i+3]=a;
  }
  out.updatePixels();
  return out;
}

function sobelEdge(inImg){
  let w=inImg.width,h=inImg.height;
  let out=createImage(w,h);
  inImg.loadPixels();
  out.loadPixels();
  let gx=[[-1,0,1],[-2,0,2],[-1,0,1]];
  let gy=[[-1,-2,-1],[0,0,0],[1,2,1]];
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      let idx=4*(x+y*w);
      let sumX=0,sumY=0;
      for(let ky=-1;ky<=1;ky++){
        for(let kx=-1;kx<=1;kx++){
          let px=x+kx,py=y+ky;
          let i2=4*(px+py*w);
          let val=inImg.pixels[i2];
          sumX+=val*gx[ky+1][kx+1];
          sumY+=val*gy[ky+1][kx+1];
        }
      }
      let mag=sqrt(sumX*sumX+sumY*sumY);
      mag=constrain(mag,0,255);
      out.pixels[idx+0]=mag; out.pixels[idx+1]=mag; out.pixels[idx+2]=mag; out.pixels[idx+3]=255;
    }
  }
  out.updatePixels();
  return out;
}

function extractChannel(img,which){
  let out=createImage(img.width,img.height);
  img.loadPixels();
  out.loadPixels();
  for(let i=0;i<img.pixels.length;i+=4){
    let r=img.pixels[i],g=img.pixels[i+1],b=img.pixels[i+2];
    let a=img.pixels[i+3];
    if(which==="red"){
      out.pixels[i]=r;out.pixels[i+1]=0;out.pixels[i+2]=0;
    } else if(which==="green"){
      out.pixels[i]=0;out.pixels[i+1]=g;out.pixels[i+2]=0;
    } else if(which==="blue"){
      out.pixels[i]=0;out.pixels[i+1]=0;out.pixels[i+2]=b;
    }
    out.pixels[i+3]=a;
  }
  out.updatePixels();
  return out;
}

function thresholdChannel(chanImg,val){
  let out=createImage(chanImg.width,chanImg.height);
  chanImg.loadPixels();
  out.loadPixels();
  for(let i=0;i<chanImg.pixels.length;i+=4){
    let r=chanImg.pixels[i],g=chanImg.pixels[i+1],b=chanImg.pixels[i+2];
    let sum=r+g+b;
    if(sum>val){
      out.pixels[i]=r; out.pixels[i+1]=g; out.pixels[i+2]=b;
    } else {
      out.pixels[i]=0; out.pixels[i+1]=0; out.pixels[i+2]=0;
    }
    out.pixels[i+3]=255;
  }
  out.updatePixels();
  return out;
}

function doMorphN(binImg,iter){
  let temp=binImg;
  for(let i=0;i<iter;i++){
    temp=erode(temp);
    temp=dilate(temp);
  }
  return temp;
}
function erode(binImg){
  let w=binImg.width,h=binImg.height;
  let out=createImage(w,h);
  binImg.loadPixels();
  out.loadPixels();
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      let i=4*(x+y*w);
      let minVal=255;
      for(let ny=-1;ny<=1;ny++){
        for(let nx=-1;nx<=1;nx++){
          let j=4*((x+nx)+(y+ny)*w);
          let v=binImg.pixels[j];
          if(v<minVal)minVal=v;
        }
      }
      out.pixels[i]=minVal; out.pixels[i+1]=minVal; out.pixels[i+2]=minVal; out.pixels[i+3]=255;
    }
  }
  out.updatePixels();
  return out;
}
function dilate(binImg){
  let w=binImg.width,h=binImg.height;
  let out=createImage(w,h);
  binImg.loadPixels();
  out.loadPixels();
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      let i=4*(x+y*w);
      let maxVal=0;
      for(let ny=-1;ny<=1;ny++){
        for(let nx=-1;nx<=1;nx++){
          let j=4*((x+nx)+(y+ny)*w);
          let v=binImg.pixels[j];
          if(v>maxVal)maxVal=v;
        }
      }
      out.pixels[i]=maxVal; out.pixels[i+1]=maxVal; out.pixels[i+2]=maxVal; out.pixels[i+3]=255;
    }
  }
  out.updatePixels();
  return out;
}

function computeOtsuThreshold(grayImg){
  grayImg.loadPixels();
  let w=grayImg.width,h=grayImg.height;
  let total=w*h;
  let hist=new Array(256).fill(0);
  for(let i=0;i<grayImg.pixels.length;i+=4){
    let v=grayImg.pixels[i];
    hist[floor(v)]++;
  }
  let sum=0;
  for(let t=0;t<256;t++){
    sum+=t*hist[t];
  }
  let sumB=0,wB=0,wF=0;
  let varMax=0,threshold=0;
  for(let t=0;t<256;t++){
    wB+=hist[t];
    if(wB===0)continue;
    wF=total-wB;if(wF===0)break;
    sumB+=t*hist[t];
    let mB=sumB/wB;
    let mF=(sum-sumB)/wF;
    let varBetween=wB*wF*(mB-mF)*(mB-mF);
    if(varBetween>varMax){
      varMax=varBetween;
      threshold=t;
    }
  }
  return threshold;
}
function thresholdImage(grayImg,thrVal){
  let out=createImage(grayImg.width,grayImg.height);
  grayImg.loadPixels();
  out.loadPixels();
  for(let i=0;i<grayImg.pixels.length;i+=4){
    let v=grayImg.pixels[i];
    let bin=(v>=thrVal)?255:0;
    out.pixels[i]=bin; out.pixels[i+1]=bin; out.pixels[i+2]=bin; out.pixels[i+3]=255;
  }
  out.updatePixels();
  return out;
}

// Additional function: convertImage => LAB
function convertImage(inImg, colorSpaceName){
  let out=createImage(inImg.width,inImg.height);
  inImg.loadPixels();
  out.loadPixels();
  for(let i=0;i<inImg.pixels.length;i+=4){
    let r=inImg.pixels[i], g=inImg.pixels[i+1], b=inImg.pixels[i+2];
    let a=inImg.pixels[i+3];
    if(colorSpaceName==="LAB"){
      let lab=rgbToLab(r,g,b);
      let L = map(lab.L,0,100,0,255);
      let A = map(lab.a,-128,127,0,255);
      let BB= map(lab.b,-128,127,0,255);
      out.pixels[i]=constrain(L,0,255);
      out.pixels[i+1]=constrain(A,0,255);
      out.pixels[i+2]=constrain(BB,0,255);
      out.pixels[i+3]=255;
    } else {
      out.pixels[i]=r; out.pixels[i+1]=g; out.pixels[i+2]=b; out.pixels[i+3]=a;
    }
  }
  out.updatePixels();
  return out;
}

function rgbToLab(r,g,b){
  let [X,Y,Z] = rgbToXyz(r,g,b);
  let whiteX=0.95047, whiteY=1.0, whiteZ=1.08883;
  let xR=X/whiteX, yR=Y/whiteY, zR=Z/whiteZ;
  function f(t){return (t>0.008856)? Math.pow(t,1/3) : (7.787*t +16/116);}
  let fx=f(xR), fy=f(yR), fz=f(zR);
  let L=116*fy-16;
  let A=500*(fx-fy);
  let B=200*(fy-fz);
  return {L,a:A,b:B};
}
function rgbToXyz(r,g,b){
  let R=r/255,G=g/255,B=b/255;
  R=(R>0.04045)? Math.pow((R+0.055)/1.055,2.4) : (R/12.92);
  G=(G>0.04045)? Math.pow((G+0.055)/1.055,2.4) : (G/12.92);
  B=(B>0.04045)? Math.pow((B+0.055)/1.055,2.4) : (B/12.92);
  let X=R*0.4124+G*0.3576+B*0.1805;
  let Y=R*0.2126+G*0.7152+B*0.0722;
  let Z=R*0.0193+G*0.1192+B*0.9505;
  return [X,Y,Z];
}
