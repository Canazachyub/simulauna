import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, CreditCard, BookOpen, Clock, AlertTriangle,
  ChevronLeft, PlayCircle, Loader2, AlertCircle
} from 'lucide-react';
import { useExamStore } from '../hooks/useExam';

export function ExamConfirmation() {
  const navigate = useNavigate();
  const { student, config, loadQuestions, status, error } = useExamStore();

  // Redirect if no student data
  useEffect(() => {
    if (!student) {
      navigate('/registro');
    }
  }, [student, navigate]);

  if (!student) return null;

  const areaConfig = config?.[student.area];

  const handleStartExam = async () => {
    await loadQuestions(student.area);
    navigate('/examen');
  };

  const instructions = [
    'El examen consta de 60 preguntas organizadas por asignatura',
    'Puedes navegar libremente entre las preguntas (avanzar y retroceder)',
    'No sabrás si tu respuesta es correcta hasta que presiones "Calificar"',
    'Usa el navegador de preguntas para saltar a cualquier pregunta',
    'Al finalizar, verás tu puntaje detallado y podrás descargar un PDF',
    'Si cierras la pestaña, perderás todo el progreso del examen'
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Preparando tu examen</h2>
          <p className="text-slate-600">Cargando preguntas...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error al cargar</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate('/registro')} className="btn-secondary">
              Volver
            </button>
            <button onClick={handleStartExam} className="btn-primary">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
              Confirmar datos del examen
            </h1>
            <p className="text-slate-600">
              Verifica tu información antes de comenzar
            </p>
          </div>

          {/* Student Info Card */}
          <div className="bg-slate-50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-slate-700 mb-4">Datos del postulante</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-400" />
                <span className="text-slate-600">DNI:</span>
                <span className="font-semibold text-slate-800">{student.dni}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <span className="text-slate-600">Nombre:</span>
                <span className="font-semibold text-slate-800">{student.fullName}</span>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-slate-400" />
                <span className="text-slate-600">Área:</span>
                <span className="font-semibold text-slate-800">{student.area}</span>
              </div>
            </div>
          </div>

          {/* Exam Info */}
          {areaConfig && (
            <div className="bg-primary-50 rounded-xl p-6 mb-8">
              <h2 className="font-semibold text-primary-700 mb-4">Detalles del examen</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-3xl font-bold text-primary-600">{areaConfig.totalQuestions}</p>
                  <p className="text-sm text-slate-600">Preguntas</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-3xl font-bold text-primary-600">{areaConfig.subjects.length}</p>
                  <p className="text-sm text-slate-600">Asignaturas</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-3xl font-bold text-primary-600">{areaConfig.totalMaxScore.toLocaleString()}</p>
                  <p className="text-sm text-slate-600">Puntaje máximo</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-3xl font-bold text-primary-600 flex items-center justify-center gap-1">
                    <Clock className="w-6 h-6" />
                    ~3h
                  </p>
                  <p className="text-sm text-slate-600">Tiempo aprox.</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-emerald-50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Instrucciones del examen
            </h2>
            <ul className="space-y-2">
              {instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2 text-emerald-800">
                  <span className="font-bold text-emerald-600">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <button
              onClick={() => navigate('/registro')}
              className="btn-secondary w-full sm:w-auto justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
              Modificar datos
            </button>
            <button
              onClick={handleStartExam}
              className="btn-primary text-lg w-full sm:w-auto justify-center"
            >
              <PlayCircle className="w-6 h-6" />
              Iniciar Examen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
