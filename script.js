document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de elementos del DOM ---
    const visualContainer = document.getElementById('grafo-visual');
    const btnEjecutarManual = document.getElementById('btn-ejecutar-manual');
    const selectInicio = document.getElementById('select-inicio');
    const selectFin = document.getElementById('select-fin');
    // Elementos de la modal
    const edgeModal = document.getElementById('edge-modal');
    const edgeWeightInput = document.getElementById('edge-weight-input');
    const saveEdgeButton = document.getElementById('save-edge-button');
    const cancelEdgeButton = document.getElementById('cancel-edge-button');
    // Botones de modo de edición
    const btnAddNodeMode = document.getElementById('btn-add-node-mode');
    const btnAddEdgeMode = document.getElementById('btn-add-edge-mode');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');

    // --- Configuración del Grafo Visual (vis-network) ---
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    const data = { nodes: nodes, edges: edges };

    const options = {
        locale: 'es', // Usar idioma español para la barra de herramientas
        interaction: {
            multiselect: false, // No permitir seleccionar múltiples nodos a la vez
        },
        manipulation: {
            enabled: false, // Deshabilitamos la barra por defecto, usaremos botones personalizados
            addNode: function (nodeData, callback) {
                // Lógica para añadir un vértice con nombre automático
                nodeData.label = getNextVertexLabel();
                callback(nodeData);
            },
            addEdge: function (edgeData, callback) {
                // Usar la modal para obtener el peso
                showEdgeModal(1, (peso) => {
                    if (peso !== null) {
                        edgeData.label = String(peso);
                        edgeData.font = { align: 'top' };
                        callback(edgeData);
                    } else {
                        callback(null); // Cancelar si se cierra la modal
                    }
                });
            },
            editEdge: function (edgeData, callback) {
                // Usar la modal para editar el peso
                showEdgeModal(edgeData.label, (peso) => {
                    if (peso !== null) {
                        edgeData.label = String(peso);
                        callback(edgeData);
                    } else {
                        callback(null);
                    }
                });
            },
        },
        nodes: {
            shape: 'circle',
            font: { size: 16, color: '#FFFFFF' },
            color: { background: '#343a40', border: '#69ce87' }
        },
        edges: {
            width: 2,
            color: { color: '#888', highlight: '#69ce87' }
        },

        physics: {
            enabled: false // Desactiva la física para que el grafo no se mueva
        }
    };

    // Crear la red
    const network = new vis.Network(visualContainer, data, options);

    // --- Lógica de la aplicación ---

    /**
     * Muestra una modal para que el usuario introduzca el peso de una arista.
     * @param {string|number} valorInicial - El valor por defecto para el input.
     * @param {function} onSave - Callback que se ejecuta al guardar. Recibe el peso o null si se cancela.
     */
    function showEdgeModal(valorInicial, onSave) {
        edgeWeightInput.value = valorInicial;
        edgeModal.style.display = 'flex';
        edgeWeightInput.focus();
        edgeWeightInput.select();

        const handleSave = () => {
            const peso = parseFloat(edgeWeightInput.value);
            if (!isNaN(peso) && peso >= 0) {
                cleanup();
                onSave(peso);
            } else {
                alert("Por favor, introduce un peso numérico válido.");
            }
        };

        const cleanup = () => {
            edgeModal.style.display = 'none';
            saveEdgeButton.removeEventListener('click', handleSave);
            cancelEdgeButton.removeEventListener('click', handleCancel);
        };

        const handleCancel = () => {
            cleanup();
            onSave(null);
        };

        saveEdgeButton.addEventListener('click', handleSave);
        cancelEdgeButton.addEventListener('click', handleCancel);
    }

    function getNextVertexLabel() {
        let charCode = 65; // Código ASCII para 'A'
        const existingLabels = new Set(nodes.get({ fields: ['label'] }).map(n => n.label));

        while (true) {
            const currentLabel = String.fromCharCode(charCode);
            if (!existingLabels.has(currentLabel)) {
                return currentLabel;
            }
            charCode++;
        }
    }


    function actualizarNodosSelect() {
        const nodosActuales = nodes.get({ fields: ['id', 'label'] });

        // Guardar selección actual para restaurarla si es posible
        const inicioSeleccionado = selectInicio.value;
        const finSeleccionado = selectFin.value;

        selectInicio.innerHTML = '';
        selectFin.innerHTML = '';

        nodosActuales.forEach(nodo => {
            const opt1 = document.createElement('option');
            opt1.value = opt1.textContent = nodo.label;
            selectInicio.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = opt2.textContent = nodo.label;
            selectFin.appendChild(opt2);
        });

        // Restaurar selección
        if (nodes.get(inicioSeleccionado)) selectInicio.value = inicioSeleccionado;
        if (nodes.get(finSeleccionado)) selectFin.value = finSeleccionado;
    }

    function obtenerDatosGrafo() {
        // Mapeamos los IDs a las etiquetas (A, B, C...)
        const nodeMap = new Map(nodes.get({ fields: ['id', 'label'] }).map(node => [node.id, node.label]));
        const aristas = edges.get().map(edge => 
            [nodeMap.get(edge.from), nodeMap.get(edge.to), parseFloat(edge.label)]
        );
        return { grafo: aristas, datosCompletos: true };
    }

    /**
     * Implementación del algoritmo de Dijkstra en JavaScript.
     * @param {Array<[string, string, number]>} aristas - Lista de aristas [origen, destino, peso].
     * @param {string} inicio - Nodo de inicio.
     * @param {string} fin - Nodo de fin.
     * @returns {{resultado: string, distancia: number}} - El camino y la distancia.
     */
    function dijkstra(aristas, inicio, fin) {
        const grafo = new Map();
        const nodos = new Set();

        for (const [origen, destino, peso] of aristas) {
            if (!grafo.has(origen)) grafo.set(origen, []);
            if (!grafo.has(destino)) grafo.set(destino, []);
            
            // Añadir arista en ambas direcciones para grafo no dirigido
            grafo.get(origen).push({ nodo: destino, peso });
            grafo.get(destino).push({ nodo: origen, peso });

            nodos.add(origen);
            nodos.add(destino);
        }
        
        if ((!nodos.has(inicio) || !nodos.has(fin)) && aristas.length > 0) {
            return { camino: null, distancia: Infinity };
        }

        const distancias = new Map();
        const predecesores = new Map();
        const colaPrioridad = []; // Usaremos un array simple como cola de prioridad

        for (const nodo of nodos) {
            distancias.set(nodo, Infinity);
            predecesores.set(nodo, null);
        }

        distancias.set(inicio, 0);
        colaPrioridad.push({ nodo: inicio, prioridad: 0 });

        while (colaPrioridad.length > 0) {
            // Ordenar para simular una cola de prioridad (saca el de menor prioridad/distancia)
            colaPrioridad.sort((a, b) => a.prioridad - b.prioridad);
            const { nodo: nodoActual, prioridad: distanciaActual } = colaPrioridad.shift();

            if (distanciaActual > distancias.get(nodoActual)) continue;
            if (nodoActual === fin) break; // Optimización: parar si llegamos al destino

            const vecinos = grafo.get(nodoActual) || [];
            for (const { nodo: vecino, peso } of vecinos) {
                const distancia = distanciaActual + peso;
                if (distancia < distancias.get(vecino)) {
                    distancias.set(vecino, distancia);
                    predecesores.set(vecino, nodoActual);
                    colaPrioridad.push({ nodo: vecino, prioridad: distancia });
                }
            }
        }

        // Reconstruir el camino
        const distanciaFinal = distancias.get(fin);
        if (distanciaFinal === Infinity) {
            return { camino: null, distancia: Infinity };
        }

        const camino = [];
        let paso = fin;
        while (paso !== null) {
            camino.unshift(paso);
            paso = predecesores.get(paso);
        }

        return { camino: camino, distancia: distanciaFinal };
    }

    function ejecutarDijkstraManual() {
        const { grafo, datosCompletos } = obtenerDatosGrafo();
        
        if (grafo.length === 0) {
            alert('No has añadido ninguna arista al grafo.');
            return;
        }
        if (!selectInicio.value || !selectFin.value) {
            alert('Selecciona un nodo de inicio y fin.');
            return;
        }

        // Ejecutar el algoritmo de Dijkstra directamente en JavaScript
        const resultado = dijkstra(grafo, selectInicio.value, selectFin.value);

        // Resaltar el camino en el grafo visual
        resaltarRuta(resultado.camino);

        if (resultado.camino) {
            // Mostrar los resultados si se encontró un camino
            document.getElementById('ruta-manual').textContent = resultado.camino.join(' -> ');
            document.getElementById('distancia-manual').textContent = resultado.distancia;
        } else {
            // Mostrar mensaje si no se encontró
            document.getElementById('ruta-manual').textContent = 'No se encontró una ruta.';
            document.getElementById('distancia-manual').textContent = 'N/A';
        }
    }

    /**
     * Resalta los nodos y aristas de la ruta encontrada en el grafo visual.
     * @param {string[]} camino - Un array con las etiquetas de los nodos en la ruta.
     */
    function resaltarRuta(camino) {
        // 1. Restablecer todos los nodos a su color original
        const todosNodos = nodes.get({ fields: ['id'] });
        const nodosUpdate = todosNodos.map(nodo => ({
            id: nodo.id,
            color: { background: '#343a40', border: '#69ce87' } // Color por defecto
        }));
        nodes.update(nodosUpdate);
    
        // Obtener los IDs de las aristas que están en el camino
        const labelToIdMap = new Map(nodes.get({ fields: ['id', 'label'] }).map(node => [node.label, node.id]));
        const aristasCaminoIds = new Set();
        if (camino && camino.length > 1) {
            for (let i = 0; i < camino.length - 1; i++) {
                const fromId = labelToIdMap.get(camino[i]);
                const toId = labelToIdMap.get(camino[i + 1]);
                const arista = edges.get({
                    filter: e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
                })[0];
                if (arista) {
                    aristasCaminoIds.add(arista.id);
                }
            }
        }
    
        // 2. Actualizar todas las aristas: verde para el camino, rojo para las demás
        const todasAristas = edges.get({ fields: ['id'] });
        const aristasUpdate = todasAristas.map(arista => ({
            id: arista.id,
            color: aristasCaminoIds.has(arista.id) ? { color: '#69ce87', highlight: '#82f7a3' } : { color: '#dc3545', highlight: '#ff5c5c' },
            width: aristasCaminoIds.has(arista.id) ? 4 : 2
        }));
        edges.update(aristasUpdate);
    
        if (!camino || camino.length === 0) return;
    
        // 3. Resaltar los nodos del camino en verde
        const nodosCaminoUpdate = camino.map(label => ({
            id: labelToIdMap.get(label),
            color: { background: '#69ce87', border: '#82f7a3' } // Color de resaltado (Verde)
        }));
        nodes.update(nodosCaminoUpdate);
    }

    // --- Asignación de Eventos ---
    btnEjecutarManual.addEventListener('click', ejecutarDijkstraManual);

    const modeButtons = [btnAddNodeMode, btnAddEdgeMode];
    function updateActiveButton(activeButton) {
        modeButtons.forEach(button => {
            if (button === activeButton) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // Asignación de eventos para los botones de modo de edición
    btnAddNodeMode.addEventListener('click', () => {
        network.addNodeMode();
        updateActiveButton(btnAddNodeMode);
    });
    btnAddEdgeMode.addEventListener('click', () => {
        network.addEdgeMode();
        updateActiveButton(btnAddEdgeMode);
    });
    btnDeleteSelected.addEventListener('click', () => network.deleteSelected());

    // Actualizar los selectores cuando el grafo cambie
    // Estos eventos se disparan después de añadir o eliminar elementos
    nodes.on('add', () => {
        actualizarNodosSelect();
        // Detiene el modo de edición y resetea el color del botón
        network.disableEditMode();
        updateActiveButton(null);
    });
    nodes.on('remove', actualizarNodosSelect);
    edges.on('add', () => {
        actualizarNodosSelect();
        // Detiene el modo de edición y resetea el color del botón
        network.disableEditMode();
        updateActiveButton(null);
    });
    edges.on('remove', actualizarNodosSelect);

    // --- Inicialización ---
    actualizarNodosSelect();
});