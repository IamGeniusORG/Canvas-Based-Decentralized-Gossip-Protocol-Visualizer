# Gossip Protocol Visualizer

A sleek, highly interactive, browser-native simulation environment for visualizing ad-hoc P2P networks and decentralized state synchronization using the HTML5 Canvas API, WebGL, and Vanilla TypeScript.

This project simulates how individual, independent network nodes communicate data payloads across an arbitrary web canvas mesh without any centralized data server, employing a **Gossip Protocol**.

## ✨ Key Features

- **Interactive Topological Playground**: Use the collapsible glassmorphism GUI to dynamically regenerate the network. Adjust constraints like **Node Count**, **Connection Radius**, **Max Peers**, and **Message Speed** in real-time to see how different topologies affect network health.
- **Convergence Time Tracking**: A built-in stopwatch accurately measures how long it takes for a newly injected message to reach 100% consensus across the entire network, allowing you to mathematically test the efficiency of different topologies.
- **Performance Optimized Rendering**: Built natively with the `Canvas API` using `requestAnimationFrame`, capable of rendering tens of thousands of active transaction particles without lagging.
- **Stunning WebGL Background**: Utilizes the lightweight `ogl` WebGL library to render beautiful, hardware-accelerated volumetric "SideRays" that illuminate the simulation.
- **Interactive Hover Physics**: Move your mouse across the canvas to actively light up nodes via proximity detection.

## 🚀 Practical Use Cases

While visually satisfying, this project is fundamentally grounded in real-world distributed systems architecture. It serves several highly practical purposes for engineers and researchers:

### 1. Educational Tool for Distributed Systems
The concepts behind distributed ledgers (like Bitcoin or Ethereum), decentralized databases (like Cassandra, IPFS), and WebRTC meshes can be highly abstract. This visualizer serves as a pedagogical tool to demonstrate how state reaches consensus asynchronously. It allows viewers to literally watch "eventual consistency" in action.

### 2. Network Topology & Heuristics Testing
Before deploying a real-world P2P application, developers must write peer-selection algorithms. By tweaking the configuration sliders in this simulation, developers can visually test heuristic algorithms to see if their constraints cause network bottlenecks, unidirectional "black holes", or isolated sub-graph "islands".

### 3. Simulation of Blockchain Mempools
In blockchain networks, when a user submits a transaction, it enters the "mempool" and is gossiped to nearby nodes until it reaches miners/validators. This visualizer perfectly simulates that exact transaction broadcast life-cycle, helping developers understand network saturation and propagation delays.

### 4. Interactive Portfolio Demonstration
For a software engineering portfolio, showing is always better than telling. This project proves an understanding of:
- Complex state management without centralized state trees.
- The mathematics of 2D spatial meshes and vector calculations.
- Performant `requestAnimationFrame` render loops natively in the browser.
- WebGL shader programming and DOM layering.
- Strong typing and Object-Oriented architecture in TypeScript.

## 🛠️ Technology Stack
- **Vanilla TypeScript**: Strictly typed object-oriented graph architecture.
- **HTML5 Canvas API**: High-performance, zero-dependency rendering engine for the P2P nodes.
- **OGL (WebGL)**: Minimalist WebGL library used for the dynamic volumetric background rays.
- **Vite**: Lightning-fast build tool and development server.
- **CSS3**: Modern, glassmorphic UI overlay with CSS gradients, variables, and smooth transform animations.

## ⚙️ Architecture & Logic

- **`Node` Class**: Tracks custom spatial coordinates, maintains a unique array of peer references, and holds a local state log (Map) to track which messages it has already seen and processed.
- **`NetworkMesh` Class**: Manages the central loop, tracks active transactions, calculates bidirectional peer discovery on initialization based on spatial proximity, and manages the Convergence Timer.
- **`SideRays` Class**: A custom WebGL shader wrapper that renders aesthetic volumetric light beams behind the primary network canvas.
- **Asynchronous Routing**: When a Node receives a message it hasn't seen before, it logs it, triggers a visual pulse, and queues an `ActiveTransaction` to all of its peers (excluding the peer that sent the message).

## 🏃‍♂️ Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173/` in your browser.
5. **Adjust the sliders**, click "Regenerate Mesh", and **click any node** to inject a data payload and watch the gossip protocol synchronize the network!
