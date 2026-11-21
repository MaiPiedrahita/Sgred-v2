USE sgred;
GO
IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name='SeqCodigoReserva')
CREATE SEQUENCE dbo.SeqCodigoReserva START WITH 1 INCREMENT BY 1;
GO
