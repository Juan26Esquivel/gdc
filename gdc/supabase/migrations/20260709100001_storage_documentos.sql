-- Bucket privado para los .docx generados (metadata en documentos.archivo_docx_path).
-- Convención de ruta: {expediente_id}/{documento_id}.docx
insert into storage.buckets (id, name, public)
values ('documentos-docx', 'documentos-docx', false)
on conflict (id) do nothing;

create policy documentos_docx_select on storage.objects for select
  using (
    bucket_id = 'documentos-docx'
    and (
      fn_usuario_rol() in ('administrador', 'juez')
      or (
        fn_usuario_rol() = 'asistente'
        and fn_expediente_asignado(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy documentos_docx_insert on storage.objects for insert
  with check (
    bucket_id = 'documentos-docx'
    and (
      fn_usuario_rol() = 'administrador'
      or (
        fn_usuario_rol() = 'asistente'
        and fn_expediente_asignado(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy documentos_docx_update on storage.objects for update
  using (
    bucket_id = 'documentos-docx'
    and (
      fn_usuario_rol() = 'administrador'
      or (
        fn_usuario_rol() = 'asistente'
        and fn_expediente_asignado(((storage.foldername(name))[1])::uuid)
      )
    )
  );
