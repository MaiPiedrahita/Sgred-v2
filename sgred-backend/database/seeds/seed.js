// Propósito: cargar datos repetibles para desarrollo y pruebas.
import { getPool, closePool, sql } from '../../src/config/database.js'
import bcrypt from 'bcrypt'
import { DateTime } from 'luxon'

async function seed() {
  const pool = await getPool()
  await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Nombre='usuario') INSERT dbo.Roles(Nombre) VALUES('usuario');
    IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Nombre='administrativo') INSERT dbo.Roles(Nombre) VALUES('administrativo');`)
  const zonas = ['Laureles','El Poblado','Belén','Robledo']
  for (const nombre of zonas) await pool.request().input('Nombre',sql.NVarChar,nombre).query(`IF NOT EXISTS(SELECT 1 FROM dbo.Zonas WHERE Nombre=@Nombre) INSERT dbo.Zonas(Nombre) VALUES(@Nombre)`)
  for (const nombre of ['Unidad deportiva','Complejo acuático']) await pool.request().input('Nombre',sql.NVarChar,nombre).query(`IF NOT EXISTS(SELECT 1 FROM dbo.TiposUnidad WHERE Nombre=@Nombre) INSERT dbo.TiposUnidad(Nombre) VALUES(@Nombre)`)
  for (const nombre of ['Cancha de fútbol','Cancha de baloncesto','Piscina','Voleibol','Cancha múltiple']) await pool.request().input('Nombre',sql.NVarChar,nombre).query(`IF NOT EXISTS(SELECT 1 FROM dbo.TiposEscenario WHERE Nombre=@Nombre) INSERT dbo.TiposEscenario(Nombre) VALUES(@Nombre)`)
  for (const nombre of ['Fútbol','Baloncesto','Natación','Voleibol','Tenis','Múltiples disciplinas']) await pool.request().input('Nombre',sql.NVarChar,nombre).query(`IF NOT EXISTS(SELECT 1 FROM dbo.Disciplinas WHERE Nombre=@Nombre) INSERT dbo.Disciplinas(Nombre) VALUES(@Nombre)`)
  for (const nombre of ['Entrenamiento','Torneo','Práctica libre']) await pool.request().input('Nombre',sql.NVarChar,nombre).query(`IF NOT EXISTS(SELECT 1 FROM dbo.TiposUso WHERE Nombre=@Nombre) INSERT dbo.TiposUso(Nombre) VALUES(@Nombre)`)

  await pool.request().query(`IF NOT EXISTS(SELECT 1 FROM dbo.UnidadesDeportivas WHERE Nombre='Unidad Deportiva Atanasio Girardot')
    INSERT INTO dbo.UnidadesDeportivas(Nombre,ZonaId,TipoUnidadId,Direccion)
    SELECT 'Unidad Deportiva Atanasio Girardot',z.Id,tu.Id,'Carrera 74 # 48-10'
    FROM dbo.Zonas z,dbo.TiposUnidad tu WHERE z.Nombre='Laureles' AND tu.Nombre='Unidad deportiva'`)
  await pool.request().query(`IF NOT EXISTS(SELECT 1 FROM dbo.UnidadesDeportivas WHERE Nombre='Unidad Deportiva de Belén')
    INSERT INTO dbo.UnidadesDeportivas(Nombre,ZonaId,TipoUnidadId,Direccion)
    SELECT 'Unidad Deportiva de Belén',z.Id,tu.Id,'Carrera 66B # 30A-20'
    FROM dbo.Zonas z,dbo.TiposUnidad tu WHERE z.Nombre='Belén' AND tu.Nombre='Unidad deportiva'`)

  for (const e of [
    ['Cancha de fútbol 1','Cancha de fútbol',22],
    ['Cancha de baloncesto','Cancha de baloncesto',16],
    ['Piscina semiolímpica','Piscina',30],
  ]) {
    await pool.request().input('Nombre',sql.NVarChar,e[0]).input('Tipo',sql.NVarChar,e[1]).input('Capacidad',sql.Int,e[2])
      .query(`IF NOT EXISTS(SELECT 1 FROM dbo.Escenarios e JOIN dbo.UnidadesDeportivas u ON u.Id=e.UnidadId WHERE u.Nombre='Unidad Deportiva Atanasio Girardot' AND e.Nombre=@Nombre)
        INSERT dbo.Escenarios(UnidadId,TipoEscenarioId,Nombre,Capacidad,Descripcion,Estado)
        SELECT u.Id,t.Id,@Nombre,@Capacidad,'Escenario deportivo SGRED','Activo'
        FROM dbo.UnidadesDeportivas u,dbo.TiposEscenario t
        WHERE u.Nombre='Unidad Deportiva Atanasio Girardot' AND t.Nombre=@Tipo`)
  }
  await pool.request().query(`UPDATE dbo.Escenarios SET Estado='Activo' WHERE Estado IS NULL`)
  await pool.request().query(`INSERT INTO dbo.HorariosOperacion(EscenarioId,DiaSemana,HoraApertura,HoraCierre)
    SELECT e.Id,d.N,CAST('06:00' AS TIME),CAST('21:00' AS TIME)
    FROM dbo.Escenarios e CROSS JOIN (VALUES(1),(2),(3),(4),(5),(6),(7)) d(N)
    WHERE NOT EXISTS(SELECT 1 FROM dbo.HorariosOperacion h WHERE h.EscenarioId=e.Id AND h.DiaSemana=d.N)`)

  const adminHash = await bcrypt.hash('Administrativo2026!',12)
  const userHash = await bcrypt.hash('Usuario2026!',12)
  await pool.request().input('Hash',sql.NVarChar,adminHash).input('Correo',sql.NVarChar,'empleado1@sgred.com')
    .query(`IF NOT EXISTS(SELECT 1 FROM dbo.Usuarios WHERE Correo=@Correo)
      INSERT dbo.Usuarios(RolId,Documento,Nombres,Apellidos,Correo,PasswordHash,PuedeGestionarUsuarios)
      SELECT r.Id,'1025123123','Andrés','Mejía',@Correo,@Hash,1 FROM dbo.Roles r WHERE r.Nombre='administrativo'`)
  await pool.request().query(`INSERT INTO dbo.AdministrativoUnidad(UsuarioId,UnidadId)
    SELECT u.Id,ud.Id FROM dbo.Usuarios u,dbo.UnidadesDeportivas ud
    WHERE u.Correo='empleado1@sgred.com' AND ud.Nombre='Unidad Deportiva Atanasio Girardot'
    AND NOT EXISTS(SELECT 1 FROM dbo.AdministrativoUnidad au WHERE au.UsuarioId=u.Id AND au.UnidadId=ud.Id)`)
  await pool.request().input('Hash',sql.NVarChar,adminHash).input('Correo',sql.NVarChar,'empleado3@sgred.com')
    .query(`IF NOT EXISTS(SELECT 1 FROM dbo.Usuarios WHERE Correo=@Correo)
      INSERT dbo.Usuarios(RolId,Documento,Nombres,Apellidos,Correo,PasswordHash,PuedeGestionarUsuarios)
      SELECT r.Id,'1025123124','Luis','Torres',@Correo,@Hash,0 FROM dbo.Roles r WHERE r.Nombre='administrativo'`)
  await pool.request().query(`INSERT INTO dbo.AdministrativoUnidad(UsuarioId,UnidadId)
    SELECT u.Id,ud.Id FROM dbo.Usuarios u,dbo.UnidadesDeportivas ud
    WHERE u.Correo='empleado3@sgred.com' AND ud.Nombre='Unidad Deportiva de Belén'
    AND NOT EXISTS(SELECT 1 FROM dbo.AdministrativoUnidad au WHERE au.UsuarioId=u.Id AND au.UnidadId=ud.Id)`)
  await pool.request().input('Hash',sql.NVarChar,userHash)
    .query(`IF NOT EXISTS(SELECT 1 FROM dbo.Usuarios WHERE Correo='usuario1@sgred.com')
      INSERT dbo.Usuarios(RolId,Documento,Nombres,Apellidos,Correo,PasswordHash,EntidadRepresentada)
      SELECT r.Id,'1019123123','Juan','López','usuario1@sgred.com',@Hash,'Club Deportivo Halcones' FROM dbo.Roles r WHERE r.Nombre='usuario'`)
  await pool.request().query(`IF NOT EXISTS(SELECT 1 FROM dbo.Escenarios e JOIN dbo.UnidadesDeportivas u ON u.Id=e.UnidadId
    WHERE u.Nombre='Unidad Deportiva de Belén' AND e.Nombre='Cancha múltiple')
    INSERT dbo.Escenarios(UnidadId,TipoEscenarioId,Nombre,Capacidad,Descripcion,Estado)
    SELECT u.Id,t.Id,'Cancha múltiple',20,'Cancha deportiva de Belén','Activo'
    FROM dbo.UnidadesDeportivas u,dbo.TiposEscenario t
    WHERE u.Nombre='Unidad Deportiva de Belén' AND t.Nombre='Cancha múltiple'`)
  const hoy = DateTime.now().setZone('America/Bogota')
  for (let i = 0; i < 5; i++) {
    const fecha = hoy.plus({ days: i + 1 }).toFormat('yyyy-MM-dd')
    await pool.request().input('Fecha', sql.Date, fecha).input('HoraInicio', sql.VarChar, `${String(8 + i).padStart(2, '0')}:00`)
      .input('HoraFin', sql.VarChar, `${String(9 + i).padStart(2, '0')}:00`)
      .query(`IF NOT EXISTS(SELECT 1 FROM dbo.Reservas r JOIN dbo.Usuarios u ON u.Id=r.UsuarioId
        WHERE u.Correo='usuario1@sgred.com' AND r.FechaReserva=@Fecha)
        INSERT dbo.Reservas(Codigo,UsuarioId,EscenarioId,FechaReserva,HoraInicio,HoraFin,TipoUso,Participantes,Observaciones,Estado)
        SELECT CONCAT('RES-2026-',RIGHT(CONCAT('00000',NEXT VALUE FOR dbo.SeqCodigoReserva),6)),
          u.Id,e.Id,@Fecha,@HoraInicio,@HoraFin,'Entrenamiento',10,'Solicitud semilla','Pendiente'
        FROM dbo.Usuarios u,dbo.Escenarios e
        JOIN dbo.UnidadesDeportivas ud ON ud.Id=e.UnidadId
        WHERE u.Correo='usuario1@sgred.com' AND ud.Nombre='Unidad Deportiva Atanasio Girardot' AND e.Nombre='Cancha de fútbol 1'`)
  }
  console.log('Seed SGRED completado')
  await closePool()
}
seed().catch((error) => { console.error(error); process.exit(1) })
