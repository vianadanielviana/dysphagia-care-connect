import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { method } = req
    const url = new URL(req.url)
    const pacienteId = url.pathname.split('/').pop()

    console.log(`Request: ${method} ${url.pathname}`)
    console.log('User ID:', user.id)

    switch (method) {
      case 'GET':
        if (pacienteId && pacienteId !== 'pacientes') {
          // Get single patient (RLS policies will control access)
          const { data: paciente, error } = await supabaseClient
            .from('pacientes')
            .select('*')
            .eq('id', pacienteId)
            .single()

          if (error) {
            console.log('Error fetching patient:', error)
            return new Response(JSON.stringify({ error: error.message }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify(paciente), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          // Get all patients (RLS policies will control access)
          const { data: pacientes, error } = await supabaseClient
            .from('pacientes')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) {
            console.log('Error fetching patients:', error)
            return new Response(JSON.stringify({ error: error.message }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify(pacientes || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

      case 'POST':
        const newPaciente = await req.json()
        
        // Validate required fields
        if (!newPaciente.nome) {
          return new Response(JSON.stringify({ error: 'Nome é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Clean the data - convert empty strings to null for database
        const pacienteData = {
          nome: newPaciente.nome.trim(),
          cpf: newPaciente.cpf?.trim() || null,
          email: newPaciente.email?.trim() || null,
          telefone: newPaciente.telefone?.trim() || null,
          data_nascimento: newPaciente.data_nascimento?.trim() || null,
          endereco: newPaciente.endereco?.trim() || null,
          diagnostico: newPaciente.diagnostico?.trim() || null,
          historico_medico: newPaciente.historico_medico?.trim() || null,
          medicamentos_atuais: newPaciente.medicamentos_atuais?.trim() || null,
          observacoes: newPaciente.observacoes?.trim() || null,
          responsavel_nome: newPaciente.responsavel_nome?.trim() || null,
          responsavel_email: newPaciente.responsavel_email?.trim() || null,
          responsavel_telefone: newPaciente.responsavel_telefone?.trim() || null,
          usuario_cadastro_id: user.id,
          tipo_usuario: 'paciente'
        }

        console.log('Inserting patient data:', pacienteData)

        const { data: createdPaciente, error: createError } = await supabaseClient
          .from('pacientes')
          .insert(pacienteData)
          .select()
          .single()

        if (createError) {
          console.log('Error creating patient:', createError)
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Patient created successfully:', createdPaciente.id)
        return new Response(JSON.stringify(createdPaciente), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'PUT':
        // Handle updates - check if ID is in URL path or in body
        let updateId = (pacienteId && pacienteId !== 'pacientes') ? pacienteId : null;
        
        const updatedData = await req.json()
        
        // If no ID in URL, check if it's in the body
        if (!updateId && updatedData.id) {
          updateId = updatedData.id;
        }

        if (!updateId) {
          return new Response(JSON.stringify({ error: 'ID do paciente é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        
        // Clean the data - convert empty strings to null for database
        const cleanedData = {
          nome: updatedData.nome?.trim(),
          cpf: updatedData.cpf?.trim() || null,
          email: updatedData.email?.trim() || null,
          telefone: updatedData.telefone?.trim() || null,
          data_nascimento: updatedData.data_nascimento?.trim() || null,
          endereco: updatedData.endereco?.trim() || null,
          diagnostico: updatedData.diagnostico?.trim() || null,
          historico_medico: updatedData.historico_medico?.trim() || null,
          medicamentos_atuais: updatedData.medicamentos_atuais?.trim() || null,
          observacoes: updatedData.observacoes?.trim() || null,
          responsavel_nome: updatedData.responsavel_nome?.trim() || null,
          responsavel_email: updatedData.responsavel_email?.trim() || null,
          responsavel_telefone: updatedData.responsavel_telefone?.trim() || null,
        }

        console.log('Updating patient with ID:', updateId)
        console.log('Updating patient data:', cleanedData)
        
        const { data: updatedPaciente, error: updateError } = await supabaseClient
          .from('pacientes')
          .update(cleanedData)
          .eq('id', updateId)
          .select()
          .single()

        if (updateError) {
          console.log('Error updating patient:', updateError)
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Patient updated successfully:', updatedPaciente.id)
        return new Response(JSON.stringify(updatedPaciente), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'DELETE':
        // Handle delete - check if ID is in URL path or in body
        let deleteId = (pacienteId && pacienteId !== 'pacientes') ? pacienteId : null;
        
        // If no ID in URL, check if it's in the body
        if (!deleteId) {
          const deleteData = await req.json();
          if (deleteData.id) {
            deleteId = deleteData.id;
          }
        }

        if (!deleteId) {
          return new Response(JSON.stringify({ error: 'ID do paciente é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Deleting patient with ID:', deleteId)

        const { error: deleteError } = await supabaseClient
          .from('pacientes')
          .delete()
          .eq('id', deleteId)

        if (deleteError) {
          console.log('Error deleting patient:', deleteError)
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Patient deleted successfully:', deleteId)
        return new Response(JSON.stringify({ message: 'Paciente excluído com sucesso' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})