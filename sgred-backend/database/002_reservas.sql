USE sgred;
GO
IF OBJECT_ID('dbo.Escenarios','U') IS NULL
CREATE TABLE dbo.Escenarios (
  Id INT IDENTITY PRIMARY KEY, UnidadId INT NOT NULL FOREIGN KEY REFERENCES dbo.UnidadesDeportivas(Id),
  TipoEscenarioId INT NOT NULL FOREIGN KEY REFERENCES dbo.TiposEscenario(Id),
  Nombre NVARCHAR(150) NOT NULL, Capacidad INT NOT NULL CHECK (Capacidad > 0),
  Descripcion NVARCHAR(500) NULL, Estado NVARCHAR(20) NOT NULL CHECK (Estado IN ('Activo','Inactivo')),
  CONSTRAINT UQ_Escenario_Unidad_Nombre UNIQUE (UnidadId, Nombre)
);

IF OBJECT_ID('dbo.HorariosOperacion','U') IS NULL
CREATE TABLE dbo.HorariosOperacion (
  Id INT IDENTITY PRIMARY KEY, EscenarioId INT NOT NULL FOREIGN KEY REFERENCES dbo.Escenarios(Id),
  DiaSemana TINYINT NOT NULL CHECK (DiaSemana BETWEEN 1 AND 7),
  HoraApertura TIME NOT NULL, HoraCierre TIME NOT NULL, CHECK (HoraCierre > HoraApertura),
  UNIQUE (EscenarioId, DiaSemana)
);

IF OBJECT_ID('dbo.Reservas','U') IS NULL
CREATE TABLE dbo.Reservas (
  Id INT IDENTITY PRIMARY KEY, Codigo NVARCHAR(30) NOT NULL UNIQUE, UsuarioId INT NOT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id),
  EscenarioId INT NOT NULL FOREIGN KEY REFERENCES dbo.Escenarios(Id), FechaReserva DATE NOT NULL,
  HoraInicio TIME NOT NULL, HoraFin TIME NOT NULL, TipoUso NVARCHAR(30) NOT NULL,
  Participantes INT NOT NULL CHECK (Participantes > 0), Observaciones NVARCHAR(300) NULL,
  Estado NVARCHAR(20) NOT NULL CHECK (Estado IN ('Pendiente','Aprobada','Rechazada','Cancelada')),
  FechaSolicitud DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), DecididoPorId INT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id),
  FechaDecision DATETIME2 NULL, MotivoRechazo NVARCHAR(300) NULL,
  CHECK (HoraFin > HoraInicio)
);
CREATE INDEX IX_Reservas_Disponibilidad ON dbo.Reservas (EscenarioId, FechaReserva, Estado);

IF OBJECT_ID('dbo.TokensEnlace','U') IS NULL
CREATE TABLE dbo.TokensEnlace (
  Id INT IDENTITY PRIMARY KEY, UsuarioId INT NOT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id),
  Tipo NVARCHAR(30) NOT NULL CHECK (Tipo IN ('definir_password','recuperar_password')),
  TokenHash CHAR(64) NOT NULL, FechaExpiracion DATETIME2 NOT NULL, Usado BIT NOT NULL DEFAULT 0,
  FechaUso DATETIME2 NULL, UNIQUE (TokenHash)
);

IF OBJECT_ID('dbo.NotificacionesCorreo','U') IS NULL
CREATE TABLE dbo.NotificacionesCorreo (
  Id INT IDENTITY PRIMARY KEY, Tipo NVARCHAR(50) NOT NULL, Destinatario NVARCHAR(150) NOT NULL,
  Asunto NVARCHAR(200) NOT NULL, Estado NVARCHAR(20) NOT NULL CHECK (Estado IN ('Enviado','Fallido')),
  Error NVARCHAR(1000) NULL, ReservaId INT NULL FOREIGN KEY REFERENCES dbo.Reservas(Id),
  UsuarioId INT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id), Fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.EventosAnalitica','U') IS NULL
CREATE TABLE dbo.EventosAnalitica (
  Id INT IDENTITY PRIMARY KEY, Evento NVARCHAR(100) NOT NULL, UsuarioId INT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id),
  Datos NVARCHAR(MAX) NULL CHECK (ISJSON(Datos)=1), Fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
