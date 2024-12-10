import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';


class BackgroundScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            physicallyCorrectLights: true // Add this
        });
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.cds = [];
        this.init();
    }

    

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        document.getElementById('background-canvas').appendChild(this.renderer.domElement);
        this.camera.position.z = 20;

        const outerRadius = 2;
        const innerRadius = 0.3;
        const cdHeight = 0.1; // Subtle height for the curved surface
        
        // Create our custom CD geometry
        const loader = new OBJLoader();
        const cdMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xaaaaaa,
            metalness: 0.9,
            roughness: 0.05,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide
        });

        // Load the CD model
        loader.load(
            './cdobj.obj', // Update this path to where your .obj file is located
            (object) => {
                // Create multiple CDs
                for (let i = 0; i < 20; i++) {
                    const cdClone = object.clone();
                    cdClone.scale.set(0.001, 0.001, 0.001); // Adjust these values as needed

                    cdClone.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.material = cdMaterial;
                        }
                    });

                    cdClone.position.set(
                        Math.random() * 60 - 30,
                        Math.random() * 60 - 30,
                        Math.random() * 30 - 15
                    );
                    cdClone.rotation.x = Math.PI / 2;

                    this.cds.push({
                        mesh: cdClone,
                        rotationSpeed: Math.random() * 0.01,
                        floatSpeed: Math.random() * 0.01,
                        floatOffset: Math.random() * Math.PI * 2
                    });
                    this.scene.add(cdClone);
                }
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened loading the CD model:', error);
            }
        );

// Enhanced lighting setup
const ambientLight = new THREE.AmbientLight(0x404040, 1);
        
const light1 = new THREE.DirectionalLight(0xffffff, 3);
light1.position.set(1, 1, 1);

const light2 = new THREE.DirectionalLight(0xffffff, 2);
light2.position.set(-1, -1, 1);

const light3 = new THREE.PointLight(0xffffff, 1);
light3.position.set(0, 0, 10);

this.scene.add(ambientLight, light1, light2, light3);


        this.animate();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;
        this.cds.forEach(cd => {
            cd.mesh.rotation.y += cd.rotationSpeed;
            cd.mesh.position.y += Math.sin(time + cd.floatOffset) * cd.floatSpeed;
        });

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

new BackgroundScene();