import './style.css';
import { SideRays } from './SideRays';

// --- Interfaces & Types ---

interface Point {
    x: number;
    y: number;
}

interface Message {
    id: string;
    payload: string;
    timestamp: number;
}

interface ActiveTransaction {
    id: string;
    from: Node;
    to: Node;
    message: Message;
    progress: number; // 0.0 to 1.0
    speed: number;
}

// Global Configuration (Mutable via UI)
let NODE_RADIUS = 8;
let CONNECTION_DISTANCE = 180;
let MAX_PEERS = 5;
let NODE_COUNT = 80;
let MESSAGE_SPEED = 0.04; // Progress increment per frame

// --- Node Class ---

class Node implements Point {
    id: string;
    x: number;
    y: number;
    peers: Node[] = [];
    stateLog: Map<string, Message> = new Map();
    
    // Visualization properties
    radius: number = NODE_RADIUS;
    isBroadcasting: boolean = false;
    broadcastRadius: number = 0;
    vx: number;
    vy: number;
    
    constructor(id: string, x: number, y: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        // Small random velocities for a gentle floating effect
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
    }

    addPeer(peer: Node) {
        if (this.peers.length < MAX_PEERS && !this.peers.includes(peer)) {
            this.peers.push(peer);
        }
    }

    update(width: number, height: number) {
        // Gently move
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        
        // Keep within bounds
        this.x = Math.max(0, Math.min(width, this.x));
        this.y = Math.max(0, Math.min(height, this.y));
    }

    receiveMessage(message: Message, network: NetworkMesh, from?: Node) {
        if (!this.stateLog.has(message.id)) {
            this.stateLog.set(message.id, message);
            this.triggerVisualPulse();
            this.gossip(message, network, from);
        }
    }

    gossip(message: Message, network: NetworkMesh, excludePeer?: Node) {
        for (const peer of this.peers) {
            if (peer !== excludePeer) {
                network.addTransaction(this, peer, message);
            }
        }
    }

    triggerVisualPulse() {
        this.isBroadcasting = true;
        this.broadcastRadius = this.radius;
    }

    draw(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) {
        // Draw broadcast pulse
        if (this.isBroadcasting) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.broadcastRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(168, 85, 247, ${1 - (this.broadcastRadius - this.radius) / 30})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            this.broadcastRadius += 1;
            if (this.broadcastRadius > this.radius + 30) {
                this.isBroadcasting = false;
                this.broadcastRadius = this.radius;
            }
        }

        // Draw node body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Color based on state
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        if (this.stateLog.size > 0) {
            gradient.addColorStop(0, '#d8b4fe');
            gradient.addColorStop(1, '#9333ea');
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 15;
        } else {
            gradient.addColorStop(0, '#9ca3af');
            gradient.addColorStop(1, '#4b5563');
            ctx.shadowBlur = 0;
        }

        // Interactive Hover Glow
        const distToMouse = Math.hypot(this.x - mouseX, this.y - mouseY);
        if (distToMouse < 40) {
            ctx.shadowColor = '#e879f9';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        }

        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset

        // Draw message count if > 0
        if (this.stateLog.size > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.stateLog.size.toString(), this.x, this.y - 16);
        }
    }
}

// --- Network Mesh Class ---

class NetworkMesh {
    nodes: Node[] = [];
    transactions: ActiveTransaction[] = [];
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    animationFrameId: number = 0;

    // Interactive State
    mouseX: number = -1000;
    mouseY: number = -1000;
    syncStartTime: number = 0;
    syncEndTime: number = 0;

    // UI Elements
    statNodes: HTMLElement;
    statTransmissions: HTMLElement;
    statSynced: HTMLElement;
    statTime: HTMLElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.statNodes = document.getElementById('stat-nodes')!;
        this.statTransmissions = document.getElementById('stat-transmissions')!;
        this.statSynced = document.getElementById('stat-synced')!;
        this.statTime = document.getElementById('stat-time')!;

        this.setupEventListeners();

        this.init();
        this.animate();
    }

    setupEventListeners() {
        this.handleResize = this.handleResize.bind(this);
        this.handleClick = this.handleClick.bind(this);
        window.addEventListener('resize', this.handleResize);
        this.canvas.addEventListener('click', this.handleClick);
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouseX = -1000;
            this.mouseY = -1000;
        });

        document.getElementById('reset-btn')?.addEventListener('click', () => this.init());

        // Panel Toggle
        document.getElementById('panel-toggle')?.addEventListener('click', () => {
            document.getElementById('ui-panel')?.classList.toggle('collapsed');
        });

        // UI Slider Bindings
        const updateVal = (id: string, val: string | number) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val.toString();
        };

        const nodeCountInput = document.getElementById('node-count') as HTMLInputElement;
        if (nodeCountInput) {
            nodeCountInput.addEventListener('input', (e) => {
                NODE_COUNT = parseInt((e.target as HTMLInputElement).value);
                updateVal('node-count-val', NODE_COUNT);
            });
        }

        const connRadiusInput = document.getElementById('conn-radius') as HTMLInputElement;
        if (connRadiusInput) {
            connRadiusInput.addEventListener('input', (e) => {
                CONNECTION_DISTANCE = parseInt((e.target as HTMLInputElement).value);
                updateVal('conn-radius-val', CONNECTION_DISTANCE);
            });
        }

        const maxPeersInput = document.getElementById('max-peers') as HTMLInputElement;
        if (maxPeersInput) {
            maxPeersInput.addEventListener('input', (e) => {
                MAX_PEERS = parseInt((e.target as HTMLInputElement).value);
                updateVal('max-peers-val', MAX_PEERS);
            });
        }

        const msgSpeedInput = document.getElementById('msg-speed') as HTMLInputElement;
        if (msgSpeedInput) {
            msgSpeedInput.addEventListener('input', (e) => {
                const val = parseInt((e.target as HTMLInputElement).value);
                MESSAGE_SPEED = val * 0.01;
                updateVal('msg-speed-val', val === 10 ? 'Max' : (val > 6 ? 'Fast' : (val > 3 ? 'Normal' : 'Slow')));
            });
        }
    }

    init() {
        this.nodes = [];
        this.transactions = [];
        this.syncStartTime = 0;
        this.syncEndTime = 0;
        this.statTime.innerText = '0.0s';
        
        // Create nodes
        for (let i = 0; i < NODE_COUNT; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.nodes.push(new Node(`node-${i}`, x, y));
        }

        // Establish connections (spatial proximity based mesh)
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            
            // Find nearby nodes
            const distances = this.nodes
                .filter(n => n !== nodeA)
                .map(nodeB => {
                    const dx = nodeA.x - nodeB.x;
                    const dy = nodeA.y - nodeB.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    return { node: nodeB, dist };
                });
            
            distances.sort((a, b) => a.dist - b.dist);
            
            // Connect to nearest peers within CONNECTION_DISTANCE
            for (const item of distances) {
                if (item.dist < CONNECTION_DISTANCE && 
                    nodeA.peers.length < MAX_PEERS && 
                    item.node.peers.length < MAX_PEERS && 
                    !nodeA.peers.includes(item.node)) {
                    
                    nodeA.peers.push(item.node);
                    item.node.peers.push(nodeA); // Properly synchronize bi-directional link
                }
            }
        }
        
        this.updateStats();
    }

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    handleClick(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        for (const node of this.nodes) {
            const dx = clickX - node.x;
            const dy = clickY - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < node.radius * 2) {
                // If this is the start of a new sync cycle
                if (this.nodes.every(n => n.stateLog.size === 0)) {
                    this.syncStartTime = Date.now();
                    this.syncEndTime = 0;
                }

                node.receiveMessage({
                    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    payload: 'Hello Decentralized World',
                    timestamp: Date.now()
                }, this);
                break;
            }
        }
    }

    addTransaction(from: Node, to: Node, message: Message) {
        // Prevent duplicate concurrent transactions between same nodes for same message
        const exists = this.transactions.some(
            t => t.from === from && t.to === to && t.message.id === message.id
        );
        
        if (!exists) {
            this.transactions.push({
                id: `tx-${Date.now()}-${Math.random()}`,
                from,
                to,
                message,
                progress: 0,
                speed: MESSAGE_SPEED + (Math.random() * 0.01) // Slight speed variation
            });
            this.updateStats();
        }
    }

    updateStats() {
        this.statNodes.innerText = this.nodes.length.toString();
        this.statTransmissions.innerText = this.transactions.length.toString();
        
        const syncedCount = this.nodes.filter(n => n.stateLog.size > 0).length;
        this.statSynced.innerText = syncedCount.toString();

        if (this.syncStartTime > 0) {
            if (syncedCount === this.nodes.length) {
                if (this.syncEndTime === 0) {
                    this.syncEndTime = Date.now();
                }
                const time = (this.syncEndTime - this.syncStartTime) / 1000;
                this.statTime.innerText = `${time.toFixed(2)}s`;
            } else {
                const time = (Date.now() - this.syncStartTime) / 1000;
                this.statTime.innerText = `${time.toFixed(2)}s`;
            }
        }
    }

    drawConnections() {
        this.ctx.lineWidth = 1;
        
        // Draw base mesh
        const drawnPairs = new Set<string>();
        
        for (const node of this.nodes) {
            for (const peer of node.peers) {
                const pairId = [node.id, peer.id].sort().join('-');
                if (drawnPairs.has(pairId)) continue;
                drawnPairs.add(pairId);
                
                this.ctx.beginPath();
                this.ctx.moveTo(node.x, node.y);
                this.ctx.lineTo(peer.x, peer.y);
                
                // Color based on synchronization state
                if (node.stateLog.size > 0 && peer.stateLog.size > 0) {
                    this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)'; // Synced connection
                } else {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Idle connection
                }
                
                this.ctx.stroke();
            }
        }
    }

    drawTransactions() {
        for (let i = this.transactions.length - 1; i >= 0; i--) {
            const tx = this.transactions[i];
            
            // Calculate current position
            const currentX = tx.from.x + (tx.to.x - tx.from.x) * tx.progress;
            const currentY = tx.from.y + (tx.to.y - tx.from.y) * tx.progress;
            
            // Draw transaction line (trail)
            this.ctx.beginPath();
            this.ctx.moveTo(tx.from.x, tx.from.y);
            this.ctx.lineTo(currentX, currentY);
            
            // Dynamic gradient for trail
            const gradient = this.ctx.createLinearGradient(tx.from.x, tx.from.y, currentX, currentY);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0.8)');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw message packet (head)
            this.ctx.beginPath();
            this.ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = 8;

            // Update progress
            tx.progress += tx.speed;
            
            // Check completion
            if (tx.progress >= 1) {
                tx.to.receiveMessage(tx.message, this, tx.from);
                this.transactions.splice(i, 1);
            }
        }
        this.ctx.shadowBlur = 0; // Reset
    }

    animate = () => {
        // Clear canvas with slight fade for motion blur effect
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.3)'; // Match background with opacity
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Update nodes
        for (const node of this.nodes) {
            node.update(this.width, this.height);
        }

        this.drawConnections();
        this.drawTransactions();
        
        // Draw nodes on top
        for (const node of this.nodes) {
            node.draw(this.ctx, this.mouseX, this.mouseY);
        }

        // Periodically update stats roughly every 30 frames to avoid spamming DOM
        if (this.animationFrameId % 30 === 0 || this.syncStartTime > 0 && this.syncEndTime === 0) {
             this.updateStats();
        }

        this.animationFrameId = requestAnimationFrame(this.animate);
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('network-canvas') as HTMLCanvasElement;
    if (canvas) new NetworkMesh(canvas);

    const appContainer = document.getElementById('app');
    if (appContainer) {
        new SideRays(appContainer, {
            speed: 2.5,
            rayColor1: "#EAB308",
            rayColor2: "#96c8ff",
            intensity: 2,
            spread: 2,
            origin: "top-right",
            tilt: 0,
            saturation: 1.5,
            blend: 0.75,
            falloff: 1.6,
            opacity: 1
        });
    }
});
