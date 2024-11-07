import React, { useState, useEffect } from "react";
import "./App.css";

// // Função para calcular o tempo de descanso dinamicamente com base no tempo de foco total realizado
// const calculateRestTime = (focus) => {
// 	if (focus < 1) {
// 		return 0; // Retorna 0 se o tempo de foco for menor que 5 minutos
// 	}
// 	const baseRest = 1; // Valor base para o descanso em minutos
// 	const increment = 0.21; // Incremento por minuto de foco adicional
// 	return Math.round((baseRest + (focus - 5) * increment) * 60); // Converte para segundos e arredonda
// };

// Dados da tabela inicial e final
const FOCUS_START = 1;
const FOCUS_END = 180;
const REST_START = 0.2;
const REST_END = 72.54;
const INDEX_START = 0.19536;
const INDEX_END = 0.403;

// Atualiza a função para calcular e formatar o tempo de descanso
function calculateRestTime(focusTime) {
	if (focusTime < FOCUS_START || focusTime > FOCUS_END) {
		console.error("O tempo de foco está fora do intervalo suportado (1 a 180 minutos).");
		return 0;
	}

	// Interpolação para calcular o índice de descanso
	const interpolatedIndex =
		INDEX_START +
		((focusTime - FOCUS_START) * (INDEX_END - INDEX_START)) / (FOCUS_END - FOCUS_START);

	// Calcula o tempo de descanso com base no índice
	const restTime = focusTime * interpolatedIndex; // em minutos

	// Converte o tempo de descanso para segundos e arredonda para o inteiro mais próximo
	return Math.round(restTime * 60); // Converte para segundos
}

// Exemplo de uso
const focusTime = 10; // Tempo de foco em minutos
const restTimeInSeconds = calculateRestTime(focusTime);

function App() {
	const [focusTime, setFocusTime] = useState(30); // Tempo de foco inicial configurado pelo usuário
	const [isRunning, setIsRunning] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [isProgressive, setIsProgressive] = useState(false); // Define se o cronômetro está em modo progressivo
	const [timer, setTimer] = useState(0);
	const [sessions, setSessions] = useState(JSON.parse(localStorage.getItem("sessions")) || []);
	const [sessionCount, setSessionCount] = useState(sessions.length + 1);
	const [predictedRestTime, setPredictedRestTime] = useState(0);
	const [showRest, setShowRest] = useState(false);
	const [isRest, setIsRest] = useState(false);
	const [initialRestTime, setInitialRestTime] = useState(0); // Tempo inicial de descanso para contagem progressiva após zero
	const [totalRestTime, setTotalRestTime] = useState(0); // Total de descanso, somando permitido e excedente
	const [focusTimeSpent, setFocusTimeSpent] = useState(0); // Tempo total de foco utilizado na sessão
	const [lastDeletedSession, setLastDeletedSession] = useState(null);
	const [balance, setBalance] = useState(() => {
		return parseInt(localStorage.getItem("balance")) || 0;
	});

	const resetBalance = () => {
		const confirmed = window.confirm("Tem certeza de que deseja zerar o saldo?");
		if (confirmed) {
			setBalance(0); // Zera o saldo
		}
	};

	useEffect(() => {
		localStorage.setItem("balance", balance);
	}, [balance]);

	useEffect(() => {
		const calculatedRestTime = calculateRestTime(focusTime);
		setPredictedRestTime(calculatedRestTime);
	}, [focusTime]);

	useEffect(() => {
		let interval = null;

		// Quando o cronômetro estiver rodando e não estiver em pausa
		if (isRunning && !isPaused) {
			interval = setInterval(() => {
				if (timer > 0 && !isProgressive) {
					setTimer((prevTimer) => prevTimer - 1);
				} else if (timer === 0 && !isProgressive) {
					alert("Rest time is over!"); // Exibe o alert apenas uma vez
					setIsRunning(false); // Encerra o descanso
					clearInterval(interval); // Limpa o intervalo
				} else if (isProgressive) {
					setTimer((prevTimer) => prevTimer + 1);
				}

				if (!isRest) {
					const focusDuration = isProgressive ? timer : focusTime * 60 - timer;
					setPredictedRestTime(calculateRestTime(focusDuration / 60));
				}

                	// Se o tempo de descanso atingir 0, dispara o alert
				if (isRest && timer === 0) {
					alert("Seu tempo de descanso acabou!");
				}
			}, 1000);
		}

            }, 1000);
		}

		return () => clearInterval(interval); 
	}, [isRunning, isPaused, timer, isProgressive, isRest, focusTime]);

	const startFocusSession = () => {
		setTimer(focusTime * 60);
		setIsRunning(true);
		setIsPaused(false);
		setShowRest(false);
		setIsRest(false);
		setIsProgressive(false);
		setFocusTimeSpent(focusTime * 60);
		setPredictedRestTime(0);
	};

	const endFocusSession = () => {
		if (isRunning && !isRest) {
			setIsRunning(false);
			const focusSessionDuration = isProgressive ? timer : focusTime * 60 - timer;

			// Atualiza o tempo de foco gasto
			setFocusTimeSpent(focusSessionDuration);

			// Calcula o tempo de descanso baseado no tempo de foco utilizado
			let calculatedRestTime = calculateRestTime(focusSessionDuration / 60);

			// Se a duração da sessão de foco for menor que o tempo estipulado
			if (focusSessionDuration < focusTime * 60) {
				// Reduz o tempo de descanso em 25%
				calculatedRestTime = Math.round(calculatedRestTime * 0.75);
			}

			// Armazena o tempo de descanso calculado
			setInitialRestTime(calculatedRestTime);
			setTotalRestTime(calculatedRestTime);

			// Exibe o botão de descanso
			setShowRest(true);
		}
	};

	const startRestSession = () => {
		setIsRunning(true);
		setIsRest(true);
		setTimer(initialRestTime);
		setShowRest(false);
		setIsProgressive(false);
	};

	const finishRestSession = () => {
		setIsRunning(false);
		setShowRest(false);

		const timeSpentInRegressive = !isProgressive ? initialRestTime - timer : initialRestTime;
		const timeSpentInProgressive = isProgressive ? Math.abs(timer) : 0;

		const totalRestDuration = timeSpentInRegressive + timeSpentInProgressive;
		setTotalRestTime(totalRestDuration);

		// Atualiza o saldo
		if (timeSpentInRegressive > 0) {
			setBalance((prevBalance) => prevBalance + timer); // Credita o tempo restante
		}
		if (timeSpentInProgressive > 0) {
			setBalance((prevBalance) => prevBalance - timeSpentInProgressive); // Debita o tempo excedente
		}

		setIsProgressive(true);
		setTimer(0);
		addSessionToTable(totalRestDuration);
		resetSession();
	};

	const addSessionToTable = (totalRestDuration) => {
		const newSession = {
			session: sessionCount,
			focus: formatTime(focusTimeSpent),
			rest: totalRestDuration === "Skipped" ? "Skipped" : formatTime(totalRestDuration),
		};

		const updatedSessions = [...sessions, newSession];
		setSessions(updatedSessions);
		localStorage.setItem("sessions", JSON.stringify(updatedSessions));
		setSessionCount((prevCount) => prevCount + 1);
	};

	const resetSession = () => {
		setFocusTime(5); // Resetando o tempo de foco para o valor padrão
		setIsRunning(false); // Desliga o cronômetro
		setTimer(0); // Zera o tempo do cronômetro
		setIsRest(false); // Desliga a sessão de descanso
		setShowRest(false); // Esconde a opção de descanso
		setTotalRestTime(0); // Zera o tempo de descanso
		setIsProgressive(false); // Desliga a contagem progressiva
		setFocusTimeSpent(0); // Zera o tempo de foco gasto
	};

	const formatTime = (seconds) => {
		if (seconds === 0) return "0";
		const minutes = Math.floor(Math.abs(seconds) / 60);
		const secs = Math.abs(seconds) % 60;
		const timeFormat = `${seconds < 0 ? "-" : ""}${minutes}:${secs < 10 ? "0" : ""}${secs}`;
		return timeFormat;
	};

	const deleteSession = (sessionIndex) => {
		const sessionToDelete = sessions[sessionIndex];
		setLastDeletedSession(sessionToDelete);

		const updatedSessions = sessions.filter((_, index) => index !== sessionIndex);
		const renumberedSessions = updatedSessions.map((session, index) => ({
			...session,
			session: index + 1,
		}));

		setSessions(renumberedSessions);
		localStorage.setItem("sessions", JSON.stringify(renumberedSessions));
	};

	const restoreLastDeletedSession = () => {
		if (lastDeletedSession) {
			const restoredSessions = [...sessions, lastDeletedSession];
			const renumberedSessions = restoredSessions.map((session, index) => ({
				...session,
				session: index + 1,
			}));

			setSessions(renumberedSessions);
			localStorage.setItem("sessions", JSON.stringify(renumberedSessions));
			setLastDeletedSession(null);
		}
	};

	// Função para pular o descanso
	const skipRestSession = () => {
		const creditedRestTime = Math.round(initialRestTime * 1.1); // Credita 10% a mais do tempo de descanso
		setBalance((prevBalance) => prevBalance + creditedRestTime); // Atualiza o saldo com o tempo creditado
		setShowRest(false); // Volta ao layout inicial
		addSessionToTable("Skipped"); // Adiciona a sessão com "Skipped" no descanso
		resetSession(); // Reseta para próxima sessão
	};

	// Função para calcular a quantidade de sessões de foco realizadas no dia
	const getTotalSessions = () => sessions.length;

	// Função para calcular o total de tempo de foco no dia
	const getTotalFocusTime = () =>
		sessions.reduce((total, session) => total + convertToSeconds(session.focus), 0);

	// Função para calcular o total de tempo de descanso no dia (ignora os "Skipped")
	const getTotalRestTime = () =>
		sessions.reduce((total, session) => {
			if (session.rest !== "Skipped") {
				return total + convertToSeconds(session.rest);
			}
			return total;
		}, 0);

	const resetDay = () => {
		const confirmReset = window.confirm("Are you sure you want to reset all sessions for the day?");
		if (confirmReset) {
			setSessions([]);
			localStorage.removeItem("sessions");
			setSessionCount(1); // Reinicia a contagem das sessões
		}
	};

	// Função auxiliar para converter "MM:SS" para segundos
	const convertToSeconds = (time) => {
		if (typeof time === "string" && time.includes(":")) {
			const [minutes, seconds] = time.split(":").map(Number);
			return minutes * 60 + seconds;
		}
		return Number(time); // Retorna o valor em segundos se já estiver no formato correto
	};

	return (
		<div className="App">
			<h1>Ultimate Pomodore</h1>
			{!isRunning && !isRest && (
				<>
					<label htmlFor="focusTime">Focus time: </label>
					<input
						type="number"
						id="focusTime"
						min="1"
						max="180"
						value={focusTime}
						onChange={(e) => setFocusTime(Math.floor(Number(e.target.value)))}
						step="1" // Permite apenas inteiros
						className="inputTime"
					/>{" "}
					minutes
					<p>Estimated rest: {formatTime(predictedRestTime)}</p>
				</>
			)}

			{isRunning && !isRest && <p>Rest time: {formatTime(predictedRestTime)}</p>}

			{showRest && (
				<>
					<button onClick={startRestSession}>Start Rest</button>
					<button onClick={skipRestSession}>Skip Rest</button>
				</>
			)}

			<button
				onClick={isRest ? finishRestSession : isRunning ? endFocusSession : startFocusSession}>
				{isRest ? "End Rest" : isRunning ? "End Focus" : "Start Focus"}
			</button>

			{isRunning && !isRest && (
				<button onClick={() => setIsPaused(!isPaused)}>
					{isPaused ? "Resume Focus" : "Pause Focus"}
				</button>
			)}

			<h2>Time:</h2>
			<p>{formatTime(timer)}</p>

			<h2>Sessions</h2>
			<table>
				<thead>
					<tr>
						<th>Session #</th>
						<th>Focus</th>
						<th>Rest</th>
						<th>Delete</th>
					</tr>
				</thead>
				<tbody>
					{sessions.map((session, index) => (
						<tr key={index}>
							<td>{session.session}</td>
							<td>{session.focus}</td>
							<td>{session.rest}</td>
							<td>
								<button onClick={() => deleteSession(index)}>Delete</button>
							</td>
						</tr>
					))}
					{/* Linha de Totais */}
					<tr>
						<td>Total Sessions: {getTotalSessions()}</td>
						<td>Total Focus Time: {formatTime(getTotalFocusTime())}</td>
						<td>Total Rest Time: {formatTime(getTotalRestTime())}</td>
						<td>
							<button onClick={resetDay}>Reset Day</button>
						</td>
					</tr>
				</tbody>
			</table>

			{lastDeletedSession && (
				<button onClick={restoreLastDeletedSession}>Restore last section</button>
			)}

			<h2>Balance:</h2>
			<p>
				{balance >= 0 ? `Credit: ${formatTime(balance)}` : `Debt: ${formatTime(Math.abs(balance))}`}
			</p>

			<button onClick={resetBalance}>Zerar Saldo</button>
		</div>
	);
}

export default App;