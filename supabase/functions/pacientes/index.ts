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
          // Get single patient
          const { data: paciente, error } = await supabaseClient
            .from('pacientes')
            .select('*')
            .eq('id', pacienteId)
            .eq('usuario_cadastro_id', user.id)
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
          // Get all patients for user
          const { data: pacientes, error } = await supabaseClient
            .from('pacientes')
            .select('*')
            .eq('usuario_cadastro_id', user.id)
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

        // Add user id to the patient data
        const pacienteData = {
          ...newPaciente,
          usuario_cadastro_id: user.id,
          tipo_usuario: 'paciente'
        }

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
        if (!pacienteId || pacienteId === 'pacientes') {
          return new Response(JSON.stringify({ error: 'ID do paciente é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const updatedData = await req.json()
        
        const { data: updatedPaciente, error: updateError } = await supabaseClient
          .from('pacientes')
          .update(updatedData)
          .eq('id', pacienteId)
          .eq('usuario_cadastro_id', user.id)
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
        if (!pacienteId || pacienteId === 'pacientes') {
          return new Response(JSON.stringify({ error: 'ID do paciente é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { error: deleteError } = await supabaseClient
          .from('pacientes')
          .delete()
          .eq('id', pacienteId)
          .eq('usuario_cadastro_id', user.id)

        if (deleteError) {
          console.log('Error deleting patient:', deleteError)
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Patient deleted successfully:', pacienteId)
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