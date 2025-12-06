import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, ChevronRight, ChevronLeft, Loader2, AlertCircle, Mail, Phone, GraduationCap, ClipboardList, ShieldAlert, Lock } from 'lucide-react';
import { useExamStore } from '../hooks/useExam';
import { validateDNI, validateName } from '../utils/calculations';
import { registerUser, checkAccess } from '../services/api';
import { AreaSelector } from './AreaSelector';
import type { AreaType, ProcessType } from '../types';

// Carreras organizadas por área
const CAREERS_BY_AREA: Record<AreaType, string[]> = {
  'Ingenierías': [
    'Ingeniería Agronómica',
    'Ingeniería Económica',
    'Ingeniería de Minas',
    'Ingeniería Geológica',
    'Ingeniería Metalúrgica',
    'Ingeniería Química',
    'Ingeniería Estadística e Informática',
    'Ingeniería Topográfica y Agrimensura',
    'Ingeniería Agroindustrial',
    'Ingeniería Agrícola',
    'Ingeniería Civil',
    'Ingeniería de Sistemas',
    'Ingeniería Mecánica Eléctrica',
    'Ingeniería Electrónica',
    'Arquitectura y Urbanismo',
    'Ciencias Físico Matemáticas: Física',
    'Ciencias Físico Matemáticas: Matemáticas',
  ],
  'Biomédicas': [
    'Medicina Veterinaria y Zootecnia',
    'Enfermería',
    'Biología: Pesquería',
    'Biología: Microbiología y Laboratorio Clínico',
    'Biología: Ecología',
    'Medicina Humana',
    'Nutrición Humana',
    'Odontología',
  ],
  'Sociales': [
    'Ciencias Contables',
    'Trabajo Social',
    'Educación Primaria',
    'Educación Inicial',
    'Educación Física',
    'Educ. Secundaria: Ciencia, Tecnología y Ambiente',
    'Educ. Secundaria: Lengua, Literatura, Psicología y Filosofía',
    'Educ. Secundaria: Matemática, Física, Computación e Informática',
    'Antropología',
    'Derecho',
    'Turismo',
    'Ciencias de la Comunicación Social',
    'Administración',
    'Arte: Música',
    'Arte: Artes Plásticas',
    'Arte: Danza',
    'Psicología',
  ],
};

export function StudentForm() {
  const navigate = useNavigate();
  const { setStudent, loadConfig, config, status, error } = useExamStore();

  const [step, setStep] = useState(1);
  const [dni, setDni] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [processType, setProcessType] = useState<ProcessType | null>(null);
  const [area, setArea] = useState<AreaType | null>(null);
  const [career, setCareer] = useState<string>('');
  const [errors, setErrors] = useState<{ dni?: string; name?: string; email?: string; phone?: string; processType?: string; area?: string; career?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState<{ show: boolean; reason: string; attemptCount: number; isFraud: boolean }>({
    show: false,
    reason: '',
    attemptCount: 0,
    isFraud: false
  });

  // Cargar configuración al montar
  useEffect(() => {
    if (!config) {
      loadConfig();
    }
  }, [config, loadConfig]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return /^9\d{8}$/.test(phone);
  };

  const validateStep1 = () => {
    const newErrors: { dni?: string; name?: string; email?: string; phone?: string } = {};

    if (!dni.trim()) {
      newErrors.dni = 'El DNI es requerido';
    } else if (!validateDNI(dni)) {
      newErrors.dni = 'El DNI debe tener 8 dígitos';
    }

    if (!fullName.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (!validateName(fullName)) {
      newErrors.name = 'Ingresa un nombre válido (mínimo 3 caracteres)';
    }

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (!phone.trim()) {
      newErrors.phone = 'El número de celular es requerido';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'El celular debe tener 9 dígitos y empezar con 9';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSelectArea = (selectedArea: AreaType) => {
    setArea(selectedArea);
    setCareer(''); // Resetear carrera al cambiar área
    setErrors({ ...errors, area: undefined, career: undefined });
  };

  const validateStep2 = () => {
    const newErrors: { processType?: string; area?: string; career?: string } = {};

    if (!processType) {
      newErrors.processType = 'Selecciona el tipo de proceso';
    }

    if (!area) {
      newErrors.area = 'Selecciona un área';
    }

    if (!career) {
      newErrors.career = 'Selecciona una carrera';
    }

    setErrors({ ...errors, ...newErrors });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      return;
    }

    setIsSubmitting(true);

    // Verificar acceso antes de continuar
    try {
      const accessResult = await checkAccess(dni.trim(), email.trim().toLowerCase());

      if (!accessResult.canAccess) {
        setAccessDenied({
          show: true,
          reason: accessResult.reason,
          attemptCount: accessResult.attemptCount,
          isFraud: accessResult.isFraudAttempt || false
        });
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn('Error al verificar acceso:', err);
      // Si falla la verificación, continuamos para no bloquear
    }

    // Registrar usuario en Google Sheets (en segundo plano, no bloquea)
    try {
      await registerUser({
        dni: dni.trim(),
        fullName: fullName.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        processType: processType!,
        area: area!,
        career
      });
    } catch (err) {
      // Si falla el registro, continuamos de todos modos (no bloqueamos al usuario)
      console.warn('No se pudo registrar usuario:', err);
    }

    setStudent({
      dni: dni.trim(),
      fullName: fullName.trim().toUpperCase(),
      area: area!,
      processType: processType!
    });

    setIsSubmitting(false);
    navigate('/confirmar');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error de conexión</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => loadConfig()} className="btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200'
              }`}>
                1
              </div>
              <span className="hidden sm:inline font-medium">Datos personales</span>
            </div>
            <div className={`w-12 h-1 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-slate-200'
              }`}>
                2
              </div>
              <span className="hidden sm:inline font-medium">Área de postulación</span>
            </div>
          </div>
        </div>

        {/* Step 1: Personal Data */}
        {step === 1 && (
          <div className="card p-8 animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                Datos del Postulante
              </h1>
              <p className="text-slate-600">
                Ingresa tu información para generar tu simulacro
              </p>
            </div>

            <div className="space-y-6">
              {/* DNI Field */}
              <div>
                <label className="label">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  DNI
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setDni(value);
                    if (errors.dni) setErrors({ ...errors, dni: undefined });
                  }}
                  placeholder="Ingresa tu DNI (8 dígitos)"
                  className={`input ${errors.dni ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  maxLength={8}
                />
                {errors.dni && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.dni}
                  </p>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label className="label">
                  <User className="w-4 h-4 inline mr-2" />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  placeholder="Ingresa tu nombre completo"
                  className={`input ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="label">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="ejemplo@correo.com"
                  className={`input ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div>
                <label className="label">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Celular
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPhone(value);
                    if (errors.phone) setErrors({ ...errors, phone: undefined });
                  }}
                  placeholder="9XXXXXXXX (9 dígitos)"
                  className={`input ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  maxLength={9}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                <ChevronLeft className="w-5 h-5" />
                Volver
              </button>
              <button
                onClick={handleNextStep}
                className="btn-primary"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Area Selection */}
        {step === 2 && (
          <div className="card p-8 animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                Postulación
              </h1>
              <p className="text-slate-600">
                Selecciona tu proceso, área y carrera
              </p>
            </div>

            <div className="space-y-6">
              {/* Process Type Selection */}
              <div>
                <label className="label">
                  <ClipboardList className="w-4 h-4 inline mr-2" />
                  Tipo de Proceso de Admisión
                </label>
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3 mt-2">
                  {(['CEPREUNA', 'GENERAL', 'EXTRAORDINARIO'] as ProcessType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setProcessType(type);
                        if (errors.processType) setErrors({ ...errors, processType: undefined });
                      }}
                      className={`p-3 sm:p-4 rounded-xl border-2 text-center text-sm sm:text-base font-medium transition-all ${
                        processType === type
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {errors.processType && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.processType}
                  </p>
                )}
              </div>

              {/* Area Selection */}
              <div>
                <label className="label mb-2">Área Académica</label>
                <AreaSelector
                  selectedArea={area}
                  onSelectArea={handleSelectArea}
                  config={config}
                />
                {errors.area && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.area}
                  </p>
                )}
              </div>

              {/* Career Selection - only shows when area is selected */}
              {area && (
                <div className="animate-fade-in">
                  <label className="label">
                    <GraduationCap className="w-4 h-4 inline mr-2" />
                    Carrera Profesional
                  </label>
                  <select
                    value={career}
                    onChange={(e) => {
                      setCareer(e.target.value);
                      if (errors.career) setErrors({ ...errors, career: undefined });
                    }}
                    className={`input mt-2 ${errors.career ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  >
                    <option value="">-- Selecciona una carrera --</option>
                    {CAREERS_BY_AREA[area].map((careerOption) => (
                      <option key={careerOption} value={careerOption}>
                        {careerOption}
                      </option>
                    ))}
                  </select>
                  {errors.career && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.career}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary"
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de acceso denegado */}
      {accessDenied.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
            <div className="text-center">
              {accessDenied.isFraud ? (
                <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
              ) : (
                <Lock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              )}

              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {accessDenied.isFraud ? 'Acceso Bloqueado' : 'Simulacro No Disponible'}
              </h2>

              <p className="text-slate-600 mb-4">
                {accessDenied.reason}
              </p>

              {!accessDenied.isFraud && accessDenied.attemptCount > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left">
                  <p className="text-amber-800 text-sm">
                    <strong>Intentos realizados:</strong> {accessDenied.attemptCount}
                  </p>
                  <p className="text-amber-700 text-sm mt-2">
                    Ya completaste tu simulacro gratuito. Para acceder a más intentos,
                    inscríbete en el programa completo.
                  </p>
                </div>
              )}

              {accessDenied.isFraud && (
                <div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
                  <p className="text-red-700 text-sm">
                    Los datos ingresados ya están registrados con información diferente.
                    Si crees que esto es un error, contacta al soporte.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setAccessDenied({ show: false, reason: '', attemptCount: 0, isFraud: false })}
                  className="btn-secondary flex-1"
                >
                  Volver
                </button>
                <a
                  href="https://wa.me/51900266810?text=Hola,%20quiero%20inscribirme%20en%20SimulaUNA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 text-center"
                >
                  Inscribirme
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
