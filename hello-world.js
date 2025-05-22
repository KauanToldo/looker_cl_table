looker.plugins.visualizations.add({
    id: "hello_world",
    label: "Hello World",
    options: {
      show_totals: {
        type: "boolean",
        label: "Mostrar linha de totais",
        default: true,
        section: "Geral"
      }
    },
    create: function(element, config) {

      element.innerHTML = `
        <style>
            .table-wrapper {
              position: relative;
              width: max-content;
            }

            .grid-table {
                display: grid;
                border: 1px solid #000000;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                width: 100%;
                gap: 0;
                box-sizing: border-box;
            }

            .header-row-1 {
              position: sticky;
              top: 0;
              z-index: 1;
              background-color: #fff;
            }

            .header-row-2 {
              position: sticky;
              z-index: 1;
              background-color: #fff;
            }

            .sticky-dimension {
              position: sticky;
              left: 0;
              background-color: #fff;
              z-index: 2;
            }
            
            .header-row-2.dimension.sticky-dimension {
              z-index: 3;
            }

            /* Célula do topo da primeira coluna (campo pivotado) */
            .header-row-1.pivot-dimension.sticky-dimension {
              z-index: 4;
            }

            .grid-cell {
                border-right: 1px solid black;
                border-top: 1px solid #ddd;
                padding: 10px;
                background: white;
                white-space: nowrap;
                font-size: 12px;
                text-decoration: none;
                color: #000000;
                box-sizing: border-box;
                margin-top: -1px;
            }

            // .grid-cell[data-col="1"], .grid-table > .grid-cell.header-row-2.dimension:last-child {
            //   max-width: 350px;
            //   white-space: wrap;
            // }

            .grid-cell.sticky-dimension {
              border-right: 1px solid #ddd
            }

            .grid-header-cell.grid-cell {
                border-right: 2px solid #ddd;
                border-top: 2px solid #ddd;
            }

            .grid-header-cell {
                font-weight: bold;
                background-color: #f2f2f2;
                font-size: 12px;
                text-align: center;
                display: flex;
                justify-content: center;
                align-items: center;
                // position: sticky;
            }

            .pivot-dimension, .dimension {
                background-color: #012C75 !important;
                color: white !important;
            }

            .measure {
                background-color: #007BFF !important;
                color: white !important;
            }

            .table-calc {
              background-color:rgb(0, 122, 65) !important;
              color: white !important;
            }

            .no-right-border {
                border-right: 1px solid transparent !important;
            }

            .grid-cell.dim-separator {
                border-right: 2px solid #012C75;
            }

            .grid-header-cell:first-child {
                border-top-left-radius: 8px;
            }
            .grid-header-cell:last-child {
                border-top-right-radius: 8px;
            }
            .numeric {
                text-align: right;
                color: black !important; //TODO tentar fugir desse important para tirar a cor vermelha dos negativos
            }

            .grid-cell span span a {
                text-decoration: none;
                color: #000000;
            }

            .grid-row-even {
                background-color: #ffffff;
            }

            .grid-row-odd {
                background-color:rgb(243, 243, 243);
            }

            .grid-cell.hovered {
                background-color: #cce5ff !important; /* azul claro para linha/coluna */
            }

            .grid-cell.hovered-cell {
                background-color: #66b3ff !important; /* azul mais escuro para a célula */
            }


            .grid-subtotal-row {
              background-color: #f9f9f9;
              font-weight: bold;
              border-top: 1px solid black;
            }

            .collapse-toggle {
              background: none;
              border: none;
              cursor: pointer;
              font-size: 12px;
              vertical-align: middle;
              padding: 0;
            }

            .round-bottom-left {
              border-bottom-left-radius: 8px;
            }

            .round-bottom-right {
              border-bottom-right-radius: 8px;
            }

            .table-calc-cell {
              background-color: #EEF5EC;
            }

            .grid-total-row {
              font-weight: bold;
              color: white !important;
              background-color: #012C75;
              border-right: 1px solid white;
            }

            .grid-total-row span span a {
              color: white !important;
            }

            .grid-total-container {
              display: grid;
              grid-template-columns: subgrid;
              grid-column: 1 / -1;
              position: sticky;
              bottom: 0;
              color: white;
              background-color: #012C75;
              z-index: 3;
            }

            .grid-total-container:first-child {
              border-radius: 8px 0px 0px 0px;
            }

            .header-subgrid-container {
              display: grid;
              grid-template-columns: subgrid;
              grid-column: 1 / -1;
              position: sticky;
              top: 0;
              color: white;
              z-index: 3;
            }

        </style>
      `;

      this._tableContainer = element.appendChild(document.createElement("div"));
      this._tableContainer.classList = "table-wrapper"
      this.trigger("registerOptions", this.options);
    },
    // Render in response to the data or settings changing
    updateAsync: function(data, element, config, queryResponse, details, done) {
        this.clearErrors();
        this._tableContainer.innerHTML = "";

        const faLink = document.createElement("link");
        faLink.rel = "stylesheet";
        faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
        document.head.appendChild(faLink);

        console.log(queryResponse)

        const pivots = queryResponse.pivots || [];
        // const pivot_label = queryResponse.fields.pivots?.[0]?.label_short || 'Label não encontrado';
        const hasPivot = pivots.length > 0;

        const dimensions = queryResponse.fields.dimensions;
        const measures = queryResponse.fields.measures;
        const tableCalcs = queryResponse.fields.table_calculations || [];
        const allMetrics = [
          ...measures.map(m => ({ ...m, _type: "measure" })),
          ...tableCalcs.map(tc => ({ ...tc, _type: "table_calc" }))
          
        ];

        // Campos diretos (dimensões e medidas)
        const mergedOptions = { ...this.options };

        const dimensionCount = dimensions.length;
        const measureCount = measures.length;
        const pivotCount = hasPivot ? pivots.length : 1;
        const totalCols = dimensionCount + (pivotCount * (measureCount + tableCalcs.length));

        // Adiciona dinamicamente labels para dimensões, medidas e cálculos
        const fields = [
          ...queryResponse.fields.dimensions,
          ...queryResponse.fields.measures,
          ...queryResponse.fields.table_calculations,
        ];

        fields.forEach(field => {
          const key = `label_${field.name}`;
          if (!mergedOptions[key]) { // só adiciona se ainda não existir
            mergedOptions[key] = {
              label: `Label para ${field.label}`,
              type: "string",
              display: "text",
              section: "Series",
              default: field.label,
              placeholder: field.label_short
            };
          }
        });

        // Campos pivotados
        if (queryResponse.fields.pivots) {
          queryResponse.fields.pivots.forEach(pivotField => {
            const key = `label_pivot_${pivotField.name}`;
            if (!mergedOptions[key]) {
              mergedOptions[key] = {
                label: `Label para pivô ${pivotField.label}`,
                type: "string",
                display: "text",
                section: "Series",
                default: pivotField.label,
                placeholder: pivotField.label_short
              };
            }
          });
        }

        function ordinal(n) {
          return n < 10 ? `0${n}` : `${n}`;
        }

        allMetrics.forEach((metric, index) => {
          const optionKey = `metric_position_${index + 1}`;

          // Gera os valores no formato de array de objetos
          const metricValues = allMetrics.map(m => ({
            [m.label]: m.name
          }));

          mergedOptions[optionKey] = {
            type: "string",
            label: `${ordinal(index + 1)} métrica`, // Ex: Primeira, Segunda, etc.
            display: "select",
            section: "Order",
            values: metricValues,
          };
        });


        this.options = mergedOptions;
        this.trigger("registerOptions", this.options);


        const metricOrderRaw = [];
        for(let i = 0; i < allMetrics.length; i++) {
          const selectedMetricName = config[`metric_position_${i+1}`];
          if(selectedMetricName) {
            metricOrderRaw.push(selectedMetricName);
          }
        }

        // Remove duplicatas, mantendo a primeira ocorrência só
        const metricOrder = [];
        metricOrderRaw.forEach(name => {
          if (!metricOrder.includes(name)) {
            metricOrder.push(name);
          }
        });

        const orderedMetrics = metricOrder.map(name =>
          allMetrics.find(metric => metric.name === name)
        ).filter(Boolean);

        const remainingMetrics = allMetrics.filter(metric =>
          !metricOrder.includes(metric.name)
        );

        const finalMetrics = [...orderedMetrics, ...remainingMetrics];

        
        function toggleGroupVisibility(groupKey, button) {
          const icon = button.querySelector("i");
          const isCollapsed = icon.classList.contains("fa-chevron-right");

          icon.classList.toggle("fa-chevron-right", !isCollapsed);
          icon.classList.toggle("fa-chevron-down", isCollapsed);

          const groupCells = tableGrid.querySelectorAll(`[data-group="${groupKey}"]:not(.grid-subtotal-row)`);
          groupCells.forEach(cell => {
            cell.style.display = isCollapsed ? "" : "none";
          });

          render_left();
        }

        // Cria o grid
        const tableGrid = document.createElement("div");
        tableGrid.className = "grid-table";
        tableGrid.style.gridTemplateColumns = `repeat(${totalCols}, minmax(50px, max-content))`;


        const headerContainer = document.createElement("div");
        headerContainer.className = "header-subgrid-container";

        // HEADER ROW 1
        if (hasPivot) {
          // Nome do campo pivotado sobre as dimensões
          const pivotedFieldDiv = document.createElement("div");
          pivotedFieldDiv.className = "grid-cell grid-header-cell header-row-1 pivot-dimension";
          pivotedFieldDiv.style.gridColumn = `span ${dimensionCount}`;
          const customLabel = config[`label_pivot_${queryResponse.fields.pivots?.[0]?.name}`];
          pivotedFieldDiv.textContent = customLabel
          headerContainer.appendChild(pivotedFieldDiv);

          // Cada pivot ocupa o espaço de suas medidas
          pivots.forEach(pivot => {
            const pivotLabel = pivot.key.split("|")[0];
            const pivotDiv = document.createElement("div");
            pivotDiv.className = "grid-cell grid-header-cell header-row-1 pivot-dimension";
            pivotDiv.style.gridColumn = `span ${measureCount + tableCalcs.length}`;
            pivotDiv.textContent = pivotLabel;
            headerContainer.appendChild(pivotDiv);
          });

          // HEADER ROW 2 (dimensões + medidas+ table calculations)
          dimensions.forEach(dim => {
            const dimDiv = document.createElement("div");
            dimDiv.className = "grid-cell grid-header-cell header-row-2 dimension";
            const customLabel = config[`label_${dim.name}`];
            dimDiv.textContent = customLabel
            headerContainer.appendChild(dimDiv);
          });

          pivots.forEach(() => {
            finalMetrics.forEach(field => {
              const div = document.createElement("div");
              div.className = `grid-cell grid-header-cell header-row-2 ${field._type === 'table_calc' ? 'table-calc' : 'measure'}`;
              const customLabel = config[`label_${field.name}`];
              div.textContent = customLabel;
              headerContainer.appendChild(div);
            });
          });
        } else {
          // Sem pivôs: cabeçalho simples (dimensões + medidas)
          dimensions.forEach(dim => {
            const div = document.createElement("div");
            div.className = "grid-cell grid-header-cell";
            const customLabel = config[`label_${dim.name}`];
            div.textContent = customLabel
            headerContainer.appendChild(div);
          });

          finalMetrics.forEach(field => {
            const div = document.createElement("div");
            div.className = `grid-cell grid-header-cell header-row-2 ${field._type === 'table_calc' ? 'table-calc' : 'measure'}`;
            const customLabel = config[`label_${field.name}`];
            div.textContent = customLabel;
            headerContainer.appendChild(div);
          });
        }
        
        tableGrid.appendChild(headerContainer);

          // BODY ROWS (com verificação de subtotal)

          const subtotalMap = new Map();
          const firstDimName = dimensions[0]?.name;

          // Preenche o mapa de subtotais, se houver
          queryResponse.subtotals_data?.[1]?.forEach(sub => {
            const dimValue = sub[firstDimName]?.value;
            if (dimValue !== undefined) {
              subtotalMap.set(dimValue, sub);
            }
          });

          // Se houver subtotais, agrupa os dados
          if (subtotalMap.size > 0) {
            // === COM SUBTOTAIS ===
            const groupedData = new Map();
            data.forEach(row => {
              const dimValue = row[firstDimName]?.value;
              if (!groupedData.has(dimValue)) {
                groupedData.set(dimValue, []);
              }
              groupedData.get(dimValue).push(row);
            });

            let currentRowIndex = 0;

            groupedData.forEach((groupRows, groupKey) => {
              const subtotalRow = subtotalMap.get(groupKey);
              let colIndex = 0;

              const subtotalRowIndex = currentRowIndex++;

              // === CÉLULA 1: Label da dimensão principal com toggle ===
              const subtotalDim1Div = document.createElement("div");
              subtotalDim1Div.className = "grid-cell sticky-dimension grid-subtotal-row";
              subtotalDim1Div.dataset.col = 0;
              subtotalDim1Div.dataset.row = subtotalRowIndex;
              subtotalDim1Div.dataset.group = groupKey;

              const labelSpan = document.createElement("span");
              const dimensionField = dimensions[0].name;
              const cellData = subtotalRow[dimensionField]; // TODO AINDA NAO TA VINDO DRILLDOWN
              labelSpan.innerHTML = LookerCharts.Utils.htmlForCell(cellData);

              const toggleButton = document.createElement("button");
              toggleButton.className = "collapse-toggle";
              toggleButton.onclick = () => toggleGroupVisibility(groupKey, toggleButton);

              // Ícone da seta
              const icon = document.createElement("i");
              icon.className = "fas fa-chevron-down";
              icon.style.marginLeft = "6px";

              toggleButton.appendChild(icon);
              subtotalDim1Div.appendChild(labelSpan);
              subtotalDim1Div.appendChild(toggleButton);

              // === CÉLULA 2: Placeholder vazia para segunda dimensão ===
              const subtotalDim2Div = document.createElement("div");
              subtotalDim2Div.className = "grid-cell sticky-dimension grid-subtotal-row dim-separator";
              subtotalDim2Div.dataset.col = 1;
              subtotalDim2Div.dataset.row = subtotalRowIndex;
              subtotalDim2Div.dataset.group = groupKey;

              // === Adiciona ambas ao grid ===
              tableGrid.appendChild(subtotalDim1Div);
              tableGrid.appendChild(subtotalDim2Div);

              colIndex = dimensions.length;

              if (hasPivot) {
                pivots.forEach(pivot => {
                  finalMetrics.forEach((field, index) => {
                  const cellData = subtotalRow[field.name]?.[pivot.key];
                  const isLastInPivotBlock = index === allMetrics.length - 1;
                  const div = document.createElement("div");
                  div.className = `grid-cell numeric grid-subtotal-row ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLastInPivotBlock ? 'no-right-border' : ''}`;
                  div.innerHTML = LookerCharts.Utils.htmlForCell(cellData);
                  div.dataset.row = subtotalRowIndex;
                  div.dataset.col = colIndex;
                  div.dataset.group = groupKey;
                  tableGrid.appendChild(div);
                  colIndex++;
                });
                });
              } else {
                finalMetrics.forEach((field, index) => {
                  const cellData = subtotalRow[field.name]?.[pivot.key];
                  const isLastInPivotBlock = index === allMetrics.length - 1;
                  const div = document.createElement("div");
                  div.className = `grid-cell numeric grid-subtotal-row ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLastInPivotBlock ? 'no-right-border' : ''}`;
                  div.innerHTML = LookerCharts.Utils.htmlForCell(cellData);
                  div.dataset.row = subtotalRowIndex;
                  div.dataset.col = colIndex;
                  div.dataset.group = groupKey;
                  tableGrid.appendChild(div);
                  colIndex++;
                });
              }

              // === LINHAS DE DADOS DO GRUPO ===
              groupRows.forEach(row => {
                const rowClass = currentRowIndex % 2 === 0 ? "grid-row-even" : "grid-row-odd";
                let colIndex = 0;
                const rowIndex = currentRowIndex;


                dimensions.forEach((dim, dIndex) => {
                  const div = document.createElement("div");
                  const isLastDimension = dIndex === dimensions.length - 1;
                  div.className = `grid-cell sticky-dimension ${rowClass} ${isLastDimension ? 'dim-separator' : ''}`;
                  div.dataset.row = rowIndex;
                  div.dataset.col = colIndex;
                  div.dataset.group = groupKey;

                  if (subtotalMap.size > 0) {
                    // Se houver subtotais, só mostra a label da última dimensão
                    div.innerHTML = isLastDimension ? LookerCharts.Utils.htmlForCell(row[dim.name]) : "";
                  } else {
                    // Caso contrário, mostra todas normalmente
                    div.innerHTML = LookerCharts.Utils.htmlForCell(row[dim.name]);
                  }

                  tableGrid.appendChild(div);
                  colIndex++;
                });

                if (hasPivot) {
                  pivots.forEach(pivot => {
                    finalMetrics.forEach((field, index) => {
                    const div = document.createElement("div");
                    const cellData = row[field.name]?.[pivot.key]; // ou row[field.name] sem pivot
                    const isLastInPivotBlock = index === allMetrics.length - 1;
                    div.className = `grid-cell numeric ${rowClass} ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLastInPivotBlock ? 'no-right-border' : ''}`;
                    div.dataset.row = rowIndex;
                    div.dataset.col = colIndex;
                    div.dataset.group = groupKey;
                    div.innerHTML = LookerCharts.Utils.htmlForCell(cellData);
                    tableGrid.appendChild(div);
                    colIndex++;
                  });
                  });
                } else {
                  finalMetrics.forEach((field, index) => {
                    const div = document.createElement("div");
                    const cellData = row[field.name]?.[pivot.key]; // ou row[field.name] sem pivot
                    const isLastInPivotBlock = index === allMetrics.length - 1;
                    div.className = `grid-cell numeric ${rowClass} ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLastInPivotBlock ? 'no-right-border' : ''}`;
                    div.dataset.row = rowIndex;
                    div.dataset.col = colIndex;
                    div.dataset.group = groupKey;
                    div.innerHTML = LookerCharts.Utils.htmlForCell(cellData);
                    tableGrid.appendChild(div);
                    colIndex++;
                  });
                }

                currentRowIndex++;
              });

              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  toggleGroupVisibility(groupKey, toggleButton);
                });
              });
          });
          } else {
            // === SEM SUBTOTAIS ===
            data.forEach((row, rowIndex) => {
              const rowClass = rowIndex % 2 === 0 ? "grid-row-even" : "grid-row-odd";
              let colIndex = 0;

              dimensions.forEach((dim, dIndex) => {
                const div = document.createElement("div");
                const isLastDimension = dIndex === dimensions.length - 1;
                div.className = `grid-cell sticky-dimension ${rowClass} ${isLastDimension ? 'dim-separator' : ''}`;
                div.dataset.row = rowIndex;
                div.dataset.col = colIndex;
                div.innerHTML = LookerCharts.Utils.htmlForCell(row[dim.name]);
                tableGrid.appendChild(div);
                colIndex++;
              });

              if (hasPivot) {
                pivots.forEach(pivot => {
                  finalMetrics.forEach((field, index) => {
                    const div = document.createElement("div");
                    const cellData = row[field.name]?.[pivot.key]; // ou row[field.name] sem pivot
                    const isLastInPivotBlock = index === allMetrics.length - 1;
                    div.className = `grid-cell numeric ${rowClass} ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLastInPivotBlock ? 'no-right-border' : ''}`;
                    div.dataset.row = rowIndex;
                    div.dataset.col = colIndex;
                    div.innerHTML = LookerCharts.Utils.htmlForCell(cellData);
                    tableGrid.appendChild(div);
                    colIndex++;
                  });
                });
              } else {
                finalMetrics.forEach((field, index) => {
                    const div = document.createElement("div");
                    const cellData = row[field.name]?.[pivot.key]; // ou row[field.name] sem pivot
                    const isLastInPivotBlock = index === allMetrics.length - 1;
                    div.className = `grid-cell numeric ${rowClass} ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLastInPivotBlock ? 'no-right-border' : ''}`;
                    div.dataset.row = rowIndex;
                    div.dataset.col = colIndex;
                    div.innerHTML = LookerCharts.Utils.htmlForCell(cellData);
                    tableGrid.appendChild(div);
                    colIndex++;
                });
              }
            });
          }

          // === LINHA FINAL DE TOTAIS GERAIS ===
          if (queryResponse.totals_data) {
            const totalRow = queryResponse.totals_data;
            const totalRowIndex = tableGrid.childElementCount / dimensions.length;

            // Criar o contêiner de totais (subgrid)
            const totalContainer = document.createElement("div");
            totalContainer.className = "grid-total-container";

            // Aplica dataset de row para manter lógica de hover, se necessário
            totalContainer.dataset.row = totalRowIndex;

            let colIndex = 0;

            // === DIMENSÕES ===
            dimensions.forEach((dim, dIndex) => {
              const div = document.createElement("div");
              const isFirstDimension = dIndex === 0;
              const isSecondDimension = dIndex === 1;

              div.className = "grid-cell sticky-dimension grid-total-row";

              if (isFirstDimension) {
                div.classList.add("no-right-border");
              }

              div.dataset.row = totalRowIndex;
              div.dataset.col = colIndex;

              // "Total" só na primeira dimensão
              div.innerHTML = isFirstDimension ? "<b>Total</b>" : "";
              totalContainer.appendChild(div);
              colIndex++;
            });

            // === MÉTRICAS ===
            if (hasPivot) {
              pivots.forEach(pivot => {
                finalMetrics.forEach((field, index) => {
                  const value = totalRow[field.name]?.[pivot.key];
                  const isLastInPivotBlock = index === allMetrics.length - 1;
                  const div = document.createElement("div");
                  div.className = `grid-cell numeric grid-total-row ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLastInPivotBlock ? 'no-right-border' : ''}`;
                  div.dataset.row = totalRowIndex;
                  div.dataset.col = colIndex;
                  div.innerHTML = LookerCharts.Utils.htmlForCell(value);
                  totalContainer.appendChild(div);
                  colIndex++;
                });
              });
            } else {
              finalMetrics.forEach((field, index) => {
                const value = totalRow[field.name];
                const isLast = index === allMetrics.length - 1;
                const div = document.createElement("div");
                div.className = `grid-cell numeric grid-total-row ${field._type === 'table_calc' ? 'table-calc-cell' : ''} ${!isLast ? 'no-right-border' : ''}`;
                div.dataset.row = totalRowIndex;
                div.dataset.col = colIndex;
                div.innerHTML = LookerCharts.Utils.htmlForCell(value);
                totalContainer.appendChild(div);
                colIndex++;
              });
            }

            // Adiciona a linha de totais ao grid principal
            tableGrid.appendChild(totalContainer);
          }


          tableGrid.addEventListener("mouseover", (e) => {
            const cell = e.target.closest(".grid-cell");
            if (cell.classList.contains("grid-header-cell")) return;
            if (cell.classList.contains("sticky-dimension")) return;
            if (cell.classList.contains("grid-total-row")) return;
            if (!cell) return;

            const row = cell.dataset.row;
            const col = cell.dataset.col;

            tableGrid.querySelectorAll(".grid-cell").forEach(c => {
                if (c.dataset.row === row || c.dataset.col === col) {
                  if(!(c.classList.contains("grid-total-row")))
                    c.classList.add("hovered");
                  }
                  if(!(c.classList.contains("grid-total-row")) && c === cell) {
                    c.classList.add("hovered-cell");
                  }
            });
          });

          tableGrid.addEventListener("mouseout", () => {
            tableGrid.querySelectorAll(".grid-cell.hovered, .grid-cell.hovered-cell").forEach(c => {
                c.classList.remove("hovered", "hovered-cell");
              });
          });


        this._tableContainer.appendChild(tableGrid);

        function applyBottomCornerRounding() {
          const allRows = Array.from(tableGrid.querySelectorAll("[data-row]"));

          // Remove classes anteriores se existirem
          allRows.forEach(cell => {
            cell.classList.remove("round-bottom-left", "round-bottom-right");
          });

          const uniqueRowIndices = [...new Set(allRows.map(cell => cell.dataset.row))];
          const lastRowIndex = Math.max(...uniqueRowIndices.map(Number));

          // Total de colunas
          const totalCols = dimensions.length + (hasPivot
            ? pivots.length * (measures.length + tableCalcs.length)
            : measures.length + tableCalcs.length);

          // Célula da esquerda
          const bottomLeftCell = tableGrid.querySelector(`[data-row="${lastRowIndex}"][data-col="0"]`);
          if (bottomLeftCell) {
            bottomLeftCell.classList.add("round-bottom-left");
          }

          // Célula da direita
          const bottomRightCell = tableGrid.querySelector(`[data-row="${lastRowIndex}"][data-col="${totalCols - 1}"]`);
          if (bottomRightCell) {
            bottomRightCell.classList.add("round-bottom-right");
          }
        }


        const totalContainer = element.querySelector('.grid-total-container');
        if (totalContainer) {
          totalContainer.style.display = config.show_totals ? 'grid' : 'none';
        }
        applyBottomCornerRounding();
        done();

        // requestAnimationFrame(() => {
        //   const firstRowCells = tableGrid.querySelectorAll(".header-row-1");
        //   if (firstRowCells.length > 0) {
        //     // Pega a maior altura da primeira linha (caso haja múltiplas células com quebras de linha)
        //     const firstRowHeight = Math.max(...Array.from(firstRowCells).map(el => el.offsetHeight));

        //     const secondRowCells = tableGrid.querySelectorAll(".header-row-2");
        //     secondRowCells.forEach(cell => {
        //       cell.style.top = `${firstRowHeight}px`;
        //     });
        //   }
        // });

       function render_left() {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const dimensionCount = dimensions.length;
            const columnLeftOffsets = [];
            let accumulatedLeft = 0;

            for (let i = 0; i < dimensionCount; i++) {
              const selector = `.grid-cell[data-col="${i}"]`;
              const cells = tableGrid.querySelectorAll(selector);
              let maxWidth = 0;

              cells.forEach(cell => {
                const rect = cell.getBoundingClientRect();
                if (rect.width > maxWidth) {
                  maxWidth = rect.width;
                }
              });

              columnLeftOffsets.push(accumulatedLeft);
              accumulatedLeft += maxWidth;
            }

            // Aplica o `left` corretamente para todas as células fixas
            for (let i = 0; i < dimensionCount; i++) {
              const left = columnLeftOffsets[i];
              const selector = `.grid-cell[data-col="${i}"]`;
              const cells = tableGrid.querySelectorAll(selector);

              cells.forEach(cell => {
                cell.classList.add("sticky-dimension");
                cell.style.left = `${left}px`;
              });

              const headerCells = tableGrid.querySelectorAll(".grid-cell.header-row-2.dimension");
              const headerCell = headerCells[i];
              if (headerCell) {
                headerCell.classList.add("sticky-dimension");
                headerCell.style.left = `${left}px`;
              }
            }

            // Fixar a célula do header-row-1 (pivot) também
            const pivotHeaderCell = tableGrid.querySelector(
              `.grid-cell.header-row-1.pivot-dimension`
            );
            if (pivotHeaderCell) {
              pivotHeaderCell.classList.add("sticky-dimension");
              pivotHeaderCell.style.left = "0px";
              pivotHeaderCell.style.zIndex = "5";
            }
          });
        });
       }

       render_left();

      }
});