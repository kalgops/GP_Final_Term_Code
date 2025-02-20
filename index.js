/*********************************************************************
 * index.js - Main Page
 * 
 * Displays the first 5 rows:
 *   Row 1: (1) Webcam image, (2) Grayscale+Bright, (3) (Blank or "No image")
 *   Row 2: R/G/B channels
 *   Row 3: Thresholded R/G/B
 *   Row 4: Webcam repeat + face detection, HSV-coded, YCbCr-coded
 *   Row 5: Filtered/swapped face, thresholded HSV, thresholded YCbCr
 * 
 * LAB color space is REMOVED from here and placed in the "extensions" page.
 *********************************************************************/

let video;
let canvasW = 1000;
let canvasH = 900; // Enough for 5 rows
let snapshot = null;
let isRealtime = false;
let faceDetectEnabled = true;

let faceapi;
let detections = [];

// Face filter modes: 0=none,1=gray,2=blur,3=HSV,4=pixelate
let faceMode = 0;

// Grid layout
const margin = 50;
const cellW  = 160;
const cellH  = 120;
const gap    = 40;

// Sliders
let sliderRed, sliderGreen, sliderBlue;
let sliderHSV, sliderYCbCr;

// UI elements
let chkRealtime, chkFaceDetect;
let selFaceFilter;
let btnDownload, btnExtensions;

function setup() {
  let cnv = createCanvas(canvasW, canvasH);
  cnv.parent("canvasContainer");

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Grab references to UI elements
  chkRealtime     = select("#chkRealtime");
  chkFaceDetect   = select("#chkFaceDetect");
  selFaceFilter   = select("#selFaceFilter");
  sliderRed       = select("#sliderRed");
  sliderGreen     = select("#sliderGreen");
  sliderBlue      = select("#sliderBlue");
  sliderHSV       = select("#sliderHSV");
  sliderYCbCr     = select("#sliderYCbCr");
  btnDownload     = select("#btnDownload");
  btnExtensions   = select("#btnExtensions");

  // Attach events
  chkRealtime.changed(() => {
    isRealtime = chkRealtime.elt.checked;
    snapshot = null;
  });
  chkFaceDetect.changed(() => {
    faceDetectEnabled = chkFaceDetect.elt.checked;
  });
  selFaceFilter.changed(() => {
    faceMode = parseInt(selFaceFilter.value());
  });
  btnDownload.mousePressed(() => {
    saveCanvas("imageProcessingGrid", "png");
  });
  // Navigate to the extension page
  btnExtensions.mousePressed(() => {
    window.location.href = "extensions.html";
  });

  // Initialize ml5 faceApi
  const faceOptions = {
    withLandmarks: true,
    withDescriptors: false,
    minConfidence: 0.5
  };
  faceapi = ml5.faceApi(video, faceOptions, () => {
    console.log("Face API loaded");
    faceapi.detect(gotFaces);
  });
}

function gotFaces(err, result) {
  if (err) {
    console.error(err);
    return;
  }
  detections = result;
  if (faceDetectEnabled) {
    faceapi.detect(gotFaces);
  }
}

function draw() {
  background(220);

  // Acquire the source image (real-time or snapshot)
  let source = (isRealtime) ? video.get() : (snapshot || video.get());

  // row positions
  let row1Y = margin;
  let row2Y = row1Y + cellH + gap;
  let row3Y = row2Y + cellH + gap;
  let row4Y = row3Y + cellH + gap;
  let row5Y = row4Y + cellH + gap;

  let col1X = margin;
  let col2X = margin + cellW + gap;
  let col3X = margin + 2*(cellW + gap);

  // Prepare base image
  let baseImage = source.get();
  baseImage.resize(cellW, cellH);

  // Row 1
  // (1) Webcam image
  image(baseImage, col1X, row1Y);
  drawLabel("Webcam image", col1X, row1Y + cellH + 4);

  // (2) Grayscale+Bright
  let grayBright = makeGrayBright(baseImage, 1.2);
  image(grayBright, col2X, row1Y);
  drawLabel("Grayscale + brightness +20%", col2X, row1Y + cellH + 4);

  // (3) We skip LAB here. Show blank or "No image"
  noFill();
  stroke(100);
  rect(col3X, row1Y, cellW, cellH);
  noStroke();
  drawLabel("(No image)", col3X, row1Y + cellH + 4);

  // Row 2: R/G/B
  let redImg   = extractChannel(baseImage, "red");
  let greenImg = extractChannel(baseImage, "green");
  let blueImg  = extractChannel(baseImage, "blue");

  image(redImg, col1X, row2Y);
  drawLabel("Red channel", col1X, row2Y + cellH + 4);

  image(greenImg, col2X, row2Y);
  drawLabel("Green channel", col2X, row2Y + cellH + 4);

  image(blueImg, col3X, row2Y);
  drawLabel("Blue channel", col3X, row2Y + cellH + 4);

  // Row 3: Thresholded R/G/B
  let thrRed   = thresholdChannel(redImg,   parseInt(sliderRed.value()));
  let thrGreen = thresholdChannel(greenImg, parseInt(sliderGreen.value()));
  let thrBlue  = thresholdChannel(blueImg,  parseInt(sliderBlue.value()));

  image(thrRed, col1X, row3Y);
  drawLabel("Threshold image (R)", col1X, row3Y + cellH + 4);

  image(thrGreen, col2X, row3Y);
  drawLabel("Threshold image (G)", col2X, row3Y + cellH + 4);

  image(thrBlue, col3X, row3Y);
  drawLabel("Threshold image (B)", col3X, row3Y + cellH + 4);

  // Row 4: repeated webcam + face detection, HSV, YCbCr
  image(baseImage, col1X, row4Y);
  drawLabel("Webcam image (repeat)", col1X, row4Y + cellH + 4);

  if (faceDetectEnabled && detections.length>0) {
    push();
    let scaleX = cellW / 640;
    let scaleY = cellH / 480;
    noFill();
    stroke(255,0,0);
    strokeWeight(2);
    for (let d of detections) {
      let box = d.alignedRect._box;
      rect(col1X + box._x*scaleX, row4Y + box._y*scaleY,
           box._width*scaleX, box._height*scaleY);
    }
    pop();
  }

  let hsvImg   = convertImage(baseImage, "HSV");
  let ycbcrImg = convertImage(baseImage, "YCbCr");

  image(hsvImg, col2X, row4Y);
  drawLabel("HSV color-coded", col2X, row4Y + cellH + 4);

  image(ycbcrImg, col3X, row4Y);
  drawLabel("YCbCr color-coded", col3X, row4Y + cellH + 4);

  // Row 5: face filter/swapped, thresholded HSV/YCbCr
  let outFaceImage = null;
  if (faceDetectEnabled && detections.length>=2) {
    // multiple-face swap
    let swapped = createImage(cellW, cellH);
    swapped.copy(baseImage, 0,0, cellW, cellH, 0,0, cellW, cellH);

    let scaleX = cellW/640, scaleY = cellH/480;
    let faceCrops = [];
    for (let d of detections) {
      let b = d.alignedRect._box;
      let x = b._x*scaleX;
      let y = b._y*scaleY;
      let w = b._width*scaleX;
      let h = b._height*scaleY;
      let crop = baseImage.get(x,y,w,h);
      faceCrops.push({x,y,w,h,crop});
    }
    // cycle-swap
    for (let i=0; i<faceCrops.length; i++){
      let src = faceCrops[i];
      let dst = faceCrops[(i+1)%faceCrops.length];
      src.crop.resize(dst.w, dst.h);
      swapped.copy(src.crop, 0,0, src.crop.width, src.crop.height,
                   dst.x, dst.y, dst.w, dst.h);
    }
    outFaceImage = swapped;
  }
  else if (faceDetectEnabled && detections.length===1) {
    // single-face filter
    let b = detections[0].alignedRect._box;
    let scaleX = cellW/640, scaleY = cellH/480;
    let xFace = b._x*scaleX;
    let yFace = b._y*scaleY;
    let wFace = b._width*scaleX;
    let hFace = b._height*scaleY;
    let faceImg = baseImage.get(xFace,yFace,wFace,hFace);
    faceImg.resize(cellW, cellH);
    outFaceImage = applyFaceMode(faceImg, faceMode);
  }

  if (outFaceImage) {
    image(outFaceImage, col1X, row5Y);
  } else {
    noFill();
    stroke(0);
    rect(col1X, row5Y, cellW, cellH);
    noStroke();
  }
  drawLabel("Face detection & replaced/swapped face", col1X, row5Y + cellH + 4);

  let hsvVal   = parseInt(sliderHSV.value());
  let ycbcrVal = parseInt(sliderYCbCr.value());
  let hsvThresh   = thresholdColorSpace(hsvImg, hsvVal);
  let ycbcrThresh = thresholdColorSpace(ycbcrImg, ycbcrVal);

  image(hsvThresh, col2X, row5Y);
  drawLabel("Thresholded HSV", col2X, row5Y + cellH + 4);

  image(ycbcrThresh, col3X, row5Y);
  drawLabel("Thresholded YCbCr", col3X, row5Y + cellH + 4);

  // Bottom instructions
  fill(0);
  noStroke();
  let instructY = height - 20;
  if (!snapshot && !isRealtime) {
    text("Click the canvas to capture a snapshot, or enable Real-Time above.", margin, instructY);
  } else if (isRealtime) {
    text("Real-Time mode is ON. Uncheck to freeze a snapshot. Face detection may reduce performance.", margin, instructY);
  } else {
    text("Snapshot captured. Press 'R' or disable Real-Time to reset. Face filter is selected from the dropdown.", margin, instructY);
  }
}

function mousePressed() {
  if (!isRealtime) {
    snapshot = video.get();
    snapshot.resize(cellW, cellH);
  }
}

function keyPressed() {
  if (key==='r' || key==='R') {
    snapshot=null;
  }
}

// ========== HELPER: drawLabel ==========
function drawLabel(txt, x, y) {
  push();
  textSize(14);
  let pad=4;
  fill(0);
  let w = textWidth(txt)+pad*2;
  let h = 18;
  rect(x, y, w, h);
  fill(255);
  text(txt, x+pad, y+h-4);
  pop();
}

// ========== Image-Processing Helpers ==========

function makeGrayBright(img, scale) {
  let out=createImage(img.width, img.height);
  img.loadPixels();
  out.loadPixels();
  for (let i=0; i<img.pixels.length; i+=4) {
    let r=img.pixels[i], g=img.pixels[i+1], b=img.pixels[i+2];
    let a=img.pixels[i+3];
    let gray=(r+g+b)/3;
    let bright=constrain(gray*scale,0,255);
    out.pixels[i]=bright; out.pixels[i+1]=bright; out.pixels[i+2]=bright; out.pixels[i+3]=a;
  }
  out.updatePixels();
  return out;
}

function extractChannel(img, which) {
  let out=createImage(img.width, img.height);
  img.loadPixels();
  out.loadPixels();
  for (let i=0; i<img.pixels.length; i+=4) {
    let r=img.pixels[i], g=img.pixels[i+1], b=img.pixels[i+2];
    let a=img.pixels[i+3];
    if (which==="red") {
      out.pixels[i]=r; out.pixels[i+1]=0; out.pixels[i+2]=0;
    } else if (which==="green") {
      out.pixels[i]=0; out.pixels[i+1]=g; out.pixels[i+2]=0;
    } else if (which==="blue") {
      out.pixels[i]=0; out.pixels[i+1]=0; out.pixels[i+2]=b;
    }
    out.pixels[i+3]=a;
  }
  out.updatePixels();
  return out;
}

function thresholdChannel(chanImg, threshVal) {
  let out=createImage(chanImg.width, chanImg.height);
  chanImg.loadPixels();
  out.loadPixels();
  for (let i=0; i<chanImg.pixels.length; i+=4) {
    let r=chanImg.pixels[i], g=chanImg.pixels[i+1], b=chanImg.pixels[i+2];
    let sum=r+g+b;
    if (sum>threshVal) {
      out.pixels[i]=r; out.pixels[i+1]=g; out.pixels[i+2]=b;
    } else {
      out.pixels[i]=0; out.pixels[i+1]=0; out.pixels[i+2]=0;
    }
    out.pixels[i+3]=255;
  }
  out.updatePixels();
  return out;
}

function thresholdColorSpace(colorImg, threshVal) {
  let out=createImage(colorImg.width, colorImg.height);
  colorImg.loadPixels();
  out.loadPixels();
  for (let i=0; i<colorImg.pixels.length; i+=4) {
    let r=colorImg.pixels[i], g=colorImg.pixels[i+1], b=colorImg.pixels[i+2];
    let sum=r+g+b;
    if (sum>threshVal) {
      out.pixels[i]=r; out.pixels[i+1]=g; out.pixels[i+2]=b;
    } else {
      out.pixels[i]=0; out.pixels[i+1]=0; out.pixels[i+2]=0;
    }
    out.pixels[i+3]=255;
  }
  out.updatePixels();
  return out;
}

function applyFaceMode(img, mode) {
  if (!img || mode===0) return img;
  if (mode===1) return makeGrayscale(img);
  if (mode===2) return makeBlur(img, 3);
  if (mode===3) return convertImage(img, "HSV");
  if (mode===4) return makePixelated(img);
  return img;
}

// Grayscale
function makeGrayscale(inImg) {
  let out=createImage(inImg.width, inImg.height);
  inImg.loadPixels();
  out.loadPixels();
  for (let i=0; i<inImg.pixels.length; i+=4) {
    let r=inImg.pixels[i], g=inImg.pixels[i+1], b=inImg.pixels[i+2];
    let a=inImg.pixels[i+3];
    let gray=(r+g+b)/3;
    out.pixels[i]=gray; out.pixels[i+1]=gray; out.pixels[i+2]=gray; out.pixels[i+3]=a;
  }
  out.updatePixels();
  return out;
}

// Blur
function makeBlur(inImg, amt) {
  let pg=createGraphics(inImg.width, inImg.height);
  pg.image(inImg,0,0);
  pg.filter(BLUR, amt);
  let out=createImage(inImg.width, inImg.height);
  out.copy(pg,0,0,inImg.width,inImg.height,0,0,inImg.width,inImg.height);
  return out;
}

// Pixelate
function makePixelated(inImg) {
  let gray=makeGrayscale(inImg);
  let out=createImage(gray.width, gray.height);
  gray.loadPixels();
  out.loadPixels();
  let blockSize=5;
  for (let by=0; by<gray.height; by+=blockSize){
    for (let bx=0; bx<gray.width; bx+=blockSize){
      let sum=0, count=0;
      for (let y=by; y<by+blockSize; y++){
        for (let x=bx; x<bx+blockSize; x++){
          if (x<gray.width && y<gray.height){
            let idx=4*(x+y*gray.width);
            sum+=gray.pixels[idx];
            count++;
          }
        }
      }
      let avg=(count>0)? sum/count:0;
      for (let y=by; y<by+blockSize; y++){
        for (let x=bx; x<bx+blockSize; x++){
          if (x<out.width && y<out.height){
            let idx=4*(x+y*out.width);
            out.pixels[idx]=avg;
            out.pixels[idx+1]=avg;
            out.pixels[idx+2]=avg;
            out.pixels[idx+3]=255;
          }
        }
      }
    }
  }
  out.updatePixels();
  return out;
}

// Convert image => HSV / YCbCr (LAB is removed from main)
function convertImage(inImg, colorSpaceName) {
  let out=createImage(inImg.width, inImg.height);
  inImg.loadPixels();
  out.loadPixels();
  for (let i=0; i<inImg.pixels.length; i+=4) {
    let r=inImg.pixels[i], g=inImg.pixels[i+1], b=inImg.pixels[i+2];
    let a=inImg.pixels[i+3];
    if (colorSpaceName==="HSV") {
      let hsv=rgbToHsv(r,g,b);
      let hScaled=map(hsv.h,0,360,0,255);
      let sScaled=hsv.s*255;
      let vScaled=hsv.v*255;
      out.pixels[i]=hScaled; out.pixels[i+1]=sScaled; out.pixels[i+2]=vScaled;
      out.pixels[i+3]=255;
    }
    else if (colorSpaceName==="YCbCr") {
      let ycbcr=rgbToYCbCr(r,g,b);
      out.pixels[i]=ycbcr.y; out.pixels[i+1]=ycbcr.cb; out.pixels[i+2]=ycbcr.cr;
      out.pixels[i+3]=255;
    }
    else {
      // Just copy
      out.pixels[i]=r; out.pixels[i+1]=g; out.pixels[i+2]=b; out.pixels[i+3]=a;
    }
  }
  out.updatePixels();
  return out;
}

// HSV
function rgbToHsv(r, g, b){
  r/=255; g/=255; b/=255;
  let max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h, s, v=max;
  let d=max-min;
  s=(max===0)?0:(d/max);
  if (max===min){h=0;}
  else {
    if (max===r)      h=(g-b)/d + (g<b?6:0);
    else if (max===g) h=(b-r)/d + 2;
    else              h=(r-g)/d +4;
    h*=60;
  }
  return {h:h, s:s, v:v};
}
function rgbToYCbCr(r, g, b){
  let y=0.299*r +0.587*g +0.114*b;
  let cb=-0.168736*r -0.331264*g +0.5*b +128;
  let cr=0.5*r -0.418688*g -0.081312*b +128;
  return {y, cb, cr};
}
