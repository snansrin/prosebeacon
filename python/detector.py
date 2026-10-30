"""Local inference for Desklib's MIT-licensed English detector.
Model: https://huggingface.co/desklib/ai-text-detector-v1.01
Architecture: DeBERTa encoder, masked mean pooling and binary linear head.
No remote Python code, pickle weights, network requests or document persistence.
"""
import json
import os
import sys

def main():
    import torch
    from safetensors.torch import load_file
    from transformers import AutoConfig, AutoModel, AutoTokenizer
    request = json.load(sys.stdin)
    text, directory = request['text'], request['modelDirectory']
    if not isinstance(text, str) or not 20 <= len(text) <= 20000:
        raise ValueError('Invalid text size')
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    config = AutoConfig.from_pretrained(directory, local_files_only=True, trust_remote_code=False)
    tokenizer = AutoTokenizer.from_pretrained(directory, local_files_only=True, trust_remote_code=False, use_fast=True)
    if not tokenizer.is_fast:
        raise ValueError('Offset-aware fast tokenizer required')
    with torch.device('meta'):
        encoder = AutoModel.from_config(config, trust_remote_code=False)
    weights = load_file(os.path.join(directory, 'model.safetensors'), device='cpu')
    encoder.load_state_dict({name.removeprefix('model.'): value for name, value in weights.items() if name.startswith('model.')}, strict=True, assign=True)
    encoder.eval()
    head_weight, head_bias = weights['classifier.weight'], weights['classifier.bias']
    encoded = tokenizer(text, add_special_tokens=False, return_offsets_mapping=True)
    ids, offsets = encoded['input_ids'], encoded['offset_mapping']
    windows, weighted, total = [], 0.0, 0
    with torch.inference_mode():
        for position in range(0, len(ids), 510):
            chunk = ids[position:position+510]
            batch = tokenizer.prepare_for_model(chunk, return_tensors='pt', return_attention_mask=True)
            inputs = {key: value.unsqueeze(0) if value.ndim == 1 else value for key, value in batch.items() if key in ('input_ids', 'attention_mask')}
            hidden = encoder(**inputs).last_hidden_state
            mask = inputs['attention_mask'].unsqueeze(-1).to(hidden.dtype)
            representation = (hidden * mask).sum(1) / mask.sum(1).clamp_min(1)
            probability = torch.sigmoid(torch.nn.functional.linear(representation, head_weight, head_bias)).item()
            start = 0 if position == 0 else offsets[position][0]
            end = len(text) if position+len(chunk) == len(ids) else offsets[position+len(chunk)][0]
            windows.append({'start':len(text[:start].encode('utf-16-le'))//2, 'end':len(text[:end].encode('utf-16-le'))//2, 'score':round(probability*100, 2), 'tokens':len(chunk)})
            weighted += probability * len(chunk)
            total += len(chunk)
    provenance_path = os.path.join(directory, 'provenance.json')
    revision = json.load(open(provenance_path, encoding='utf-8')).get('revision') if os.path.exists(provenance_path) else None
    print(json.dumps({'engine':'desklib-deberta-v1.01', 'revision':revision, 'score':round(weighted/max(total,1)*100,2), 'windows':windows,
                     'notice':'Uncalibrated English model score; not proof of authorship or a Turnitin prediction. Windows cover the entire submitted text.'}))

if __name__ == '__main__':
    try:
        main()
    except Exception:
        print(json.dumps({'error':'Local detector inference failed'}))
        sys.exit(1)
