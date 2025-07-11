import * as THREE from 'three';

let canvas = document.getElementById('testCanvas');
const resultsDiv = document.getElementById('results');
const audioControlsDiv = document.getElementById('audio-controls');
const runTestsBtn = document.getElementById('run-tests-btn');
const imageUrl = './dragon.png';
let generatedAudioUrl = '';

// --- Test Runner ---

async function runTests() {
    runTestsBtn.disabled = true;
    runTestsBtn.textContent = 'Running...';
    audioControlsDiv.innerHTML = ''; // Clear previous audio players
    resultsDiv.innerHTML = 'Starting tests...\n';
    
    await testRenderImageOnCanvas();
    await testEditImageOnCanvas();
    await testRenderIn3DScene();
    await testAIImageAnalysis();
    await testGenerateAudio();
    await testVoiceCloneTTS();
    
    resultsDiv.innerHTML += '\nAll tests complete.';
    runTestsBtn.disabled = false;
    runTestsBtn.textContent = 'Run Tests Again';
}

function logResult(testName, passed, details = '') {
    const status = passed ? 'PASSED' : 'FAILED';
    const color = passed ? 'passed' : 'failed';
    resultsDiv.innerHTML += `\n<span class="status ${color}">${status}</span> - <b>${testName}</b>\n`;
    if (details) {
        resultsDiv.innerHTML += `  > ${details}\n`;
    }
}


// --- Image Loader Utility ---

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image at ${src}.`));
        img.src = src;
    });
}

// --- Test Definitions ---

/**
 * Test 1: Renders the image on a canvas.
 */
async function testRenderImageOnCanvas() {
    const testName = 'Render Image on 2D Canvas';
    const ctx = canvas.getContext('2d');
    try {
        const img = await loadImage(imageUrl);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const pixelData = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
        if (pixelData[3] > 0) { // Check alpha channel is not fully transparent
            logResult(testName, true, 'Image drawn, and canvas is not empty.');
        } else {
            throw new Error('Canvas appears to be empty after drawing.');
        }
    } catch (error) {
        logResult(testName, false, error.message);
    }
}

/**
 * Test 2: Edits the image on the canvas.
 */
async function testEditImageOnCanvas() {
    const testName = 'Edit Image on Canvas';
    const ctx = canvas.getContext('2d');
    try {
        // We need to re-render the base image because the canvas might have been replaced.
        await testRenderImageOnCanvas();
        
        const originalPixel = ctx.getImageData(10, 10, 1, 1).data;
        
        // Edit by drawing a red square
        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        ctx.fillRect(10, 10, 5, 5);
        
        const newPixel = ctx.getImageData(10, 10, 1, 1).data;
        
        if (newPixel[0] === 255 && newPixel[1] === 0 && newPixel[2] === 0) {
            logResult(testName, true, 'Drew a red square on the canvas successfully.');
        } else {
            throw new Error('Pixel color did not change to red as expected.');
        }
    } catch (error) {
        logResult(testName, false, error.message);
    }
}

/**
 * Test 3: Renders the image in a 3D scene using Three.js.
 */
async function testRenderIn3DScene() {
    const testName = 'Render Image in 3D Scene';
    try {
        // To prevent context type errors, we replace the canvas element.
        const canvasContainer = document.getElementById('canvas-container');
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'testCanvas';
        newCanvas.width = 512;
        newCanvas.height = 512;
        canvasContainer.innerHTML = ''; // Clear old canvas
        canvasContainer.appendChild(newCanvas);
        canvas = newCanvas; // Update global reference

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(canvas.width, canvas.height);
        renderer.setClearColor(0xdddddd);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
        camera.position.z = 350;

        const texture = await new THREE.TextureLoader().loadAsync(imageUrl);
        const geometry = new THREE.PlaneGeometry(512, 512);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        renderer.render(scene, camera);
        
        if (scene.children.length > 0 && scene.children[0] === plane) {
             logResult(testName, true, 'Three.js scene created and image texture applied to a plane.');
        } else {
            throw new Error('Scene setup failed or plane not added.');
        }
        renderer.dispose(); // Clean up
        // We must re-render the 2D image for subsequent tests.
        await testRenderImageOnCanvas();
    } catch (error) {
        logResult(testName, false, `Three.js error: ${error.message}`);
    }
}

/**
 * Test 4: Asks the AI to describe the image.
 */
async function testAIImageAnalysis() {
    const testName = 'AI Image Analysis';
    try {
        // We need a fresh canvas with just the original image for the AI
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 512;
        tempCanvas.height = 512;
        const tempCtx = tempCanvas.getContext('2d');
        const img = await loadImage(imageUrl);
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        const imageDataUrl = tempCanvas.toDataURL('image/png');

        const completion = await websim.chat.completions.create({
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: "Describe this image in detail. What creature is it? What is the mood?" }, 
                    { type: "image_url", image_url: { url: imageDataUrl } }
                ],
            }],
        });

        const description = completion.content;
        if (description && description.toLowerCase().includes('dragon')) {
            logResult(testName, true, `AI correctly identified the dragon. Response: "${description.substring(0, 100)}..."`);
        } else {
            throw new Error(`AI analysis failed or did not identify a dragon. Response: ${description}`);
        }
    } catch (error) {
        logResult(testName, false, `AI API call error: ${error.message}`);
    }
}

/**
 * Test 5: Generates a short audio clip.
 */
async function testGenerateAudio() {
    const testName = 'Generate sample audio for TTS';
    try {
        const result = await websim.textToSpeech({
            text: "The treasure is guarded by the ancient wyrm.",
            voice: "en-male"
        });

        if (result.url) {
            generatedAudioUrl = result.url;
            logResult(testName, true, `Audio generated successfully.`);
            
            const audio = new Audio(generatedAudioUrl);
            audio.controls = true;
            const label = document.createElement('p');
            label.textContent = 'Generated audio sample:';
            audioControlsDiv.appendChild(label);
            audioControlsDiv.appendChild(audio);

        } else {
            throw new Error('Audio generation failed, no URL returned.');
        }
    } catch (error) {
        logResult(testName, false, `Audio generation error: ${error.message}`);
    }
}

/**
 * Test 6: Uses the generated audio to create TTS with a cloned voice.
 */
async function testVoiceCloneTTS() {
    const testName = 'TTS with Cloned Voice';
    if (!generatedAudioUrl) {
        logResult(testName, false, 'Skipping test: sample audio not available.');
        return;
    }
    
    try {
        const result = await websim.textToSpeech({
            text: "My voice has been cloned. I can say anything now!",
            voice: generatedAudioUrl // Pass the URL of the audio file to clone
        });

        if (result.url) {
            logResult(testName, true, 'TTS with cloned voice completed successfully.');
            
            const audio = new Audio(result.url);
            audio.controls = true;
            const label = document.createElement('p');
            label.textContent = 'Cloned voice TTS output:';
            audioControlsDiv.appendChild(label);
            audioControlsDiv.appendChild(audio);
        } else {
            throw new Error('TTS with cloned voice failed, no URL returned.');
        }
    } catch (error) {
        logResult(testName, false, `TTS cloning error: ${error.message}`);
    }
}

// --- Start Execution ---

runTestsBtn.addEventListener('click', runTests);